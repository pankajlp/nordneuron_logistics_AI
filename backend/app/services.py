"""Business logic for each module.

These functions are pure (no DB access) so they are easy to unit-test and to
swap for a real pricing/routing engine later. The DB supplies the reference
inputs (tariffs, vessel data, etc.); these functions turn them into results.
"""
import math
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional


# ---------------------------------------------------------------------------
# Freight calculator
# ---------------------------------------------------------------------------
def origin_key_from_lane(lane: str) -> str:
    lane = (lane or "").lower()
    for key in ("shanghai", "shenzhen", "ningbo"):
        if key in lane:
            return key
    return "default"


def compute_freight(
    *,
    lane: str,
    container_type: str,
    season_multiplier: float,
    baf: float,
    congestion: float,
    local: float,
    margin_pct: float,
    tariffs: Dict[str, Dict[str, float]],
) -> dict:
    origin_key = origin_key_from_lane(lane)
    table = tariffs.get(origin_key) or tariffs.get("default", {})
    base_ocean = table.get(container_type)
    if base_ocean is None:
        base_ocean = tariffs.get("default", {}).get(container_type, 0.0)

    base_ocean *= season_multiplier

    total_surcharges = (baf or 0) + (congestion or 0) + (local or 0)
    allin_cost = base_ocean + total_surcharges

    margin_fraction = margin_pct / 100.0
    # Guard against divide-by-zero at 100% margin.
    sell_price = allin_cost / (1 - margin_fraction) if margin_fraction < 1 else allin_cost
    profit = sell_price - allin_cost

    history_labels = ["Bid FY2024", "Bid H1-2025", "Bid H2-2025", "NordNeuron Quote (Current)"]
    history_sell = [sell_price * 1.18, sell_price * 1.05, sell_price * 0.92, sell_price]
    history_cost = [allin_cost * 1.15, allin_cost * 1.02, allin_cost * 0.94, allin_cost]

    return {
        "origin_key": origin_key,
        "base_ocean": round(base_ocean, 2),
        "total_surcharges": round(total_surcharges, 2),
        "allin_cost": round(allin_cost, 2),
        "margin_pct": margin_pct,
        "profit": round(profit, 2),
        "sell_price": round(sell_price, 2),
        "history_labels": history_labels,
        "history_sell": [round(v, 2) for v in history_sell],
        "history_cost": [round(v, 2) for v in history_cost],
    }


# ---------------------------------------------------------------------------
# Demurrage calculator
# ---------------------------------------------------------------------------
def compute_demurrage(
    *,
    arrival_date: date,
    pickup_date: date,
    free_days: int,
    daily_rate: float,
    surcharge_multiplier: float = 1.5,
    surcharge_after_days: int = 5,
) -> dict:
    total_days = math.ceil((pickup_date - arrival_date).days)
    overdue_days = max(0, total_days - free_days)

    # Progressive cost projection over a 15-day horizon.
    cost_projection: List[float] = []
    running = 0.0
    for day in range(1, 16):
        if day <= free_days:
            cost_projection.append(0.0)
        else:
            extra = day - free_days
            mult = surcharge_multiplier if extra > surcharge_after_days else 1.0
            running += daily_rate * mult
            cost_projection.append(round(running, 2))

    total_fee = 0.0
    for i in range(1, overdue_days + 1):
        mult = surcharge_multiplier if i > surcharge_after_days else 1.0
        total_fee += daily_rate * mult

    # Risk assessment
    risk_level, alert_title, alert_desc = "SAFE", "Pickup Schedule Safe", (
        "Container is scheduled for pickup within the allocated free days. "
        "No late fees will accumulate."
    )
    if overdue_days > 0:
        risk_level = "CRITICAL"
        alert_title = "Late Penalty Charges Active"
        alert_desc = (
            f"Late pickup is costing ${daily_rate:,.0f}/day. Demurrage rate compounds "
            f"by +{int((surcharge_multiplier - 1) * 100)}% after {surcharge_after_days} "
            "overdue days. Urgent pickup action advised!"
        )
    elif total_days == free_days:
        risk_level = "WARNING"
        alert_title = "Last Day of Free Storage"
        alert_desc = (
            "Container must be picked up today. Delaying pickup until tomorrow will "
            "trigger immediate carrier penalties."
        )

    cutoff_date = arrival_date + timedelta(days=free_days)

    return {
        "total_days": total_days,
        "overdue_days": overdue_days,
        "total_fee": round(total_fee, 2),
        "free_days": free_days,
        "daily_rate": daily_rate,
        "risk_level": risk_level,
        "alert_title": alert_title,
        "alert_desc": alert_desc,
        "cost_projection": cost_projection,
        "cutoff_date": cutoff_date,
    }


# ---------------------------------------------------------------------------
# ETA predictor
# ---------------------------------------------------------------------------
_WEATHER_DELAY = {0: 0.0, 1: 1.2, 2: 4.5}
_CONGESTION_DELAY = {0: 0.2, 1: 1.5, 2: 3.8}


def compute_eta(
    *,
    base_transit_days: float,
    progress_pct: float,
    weather: int,
    congestion: int,
    live_speed_knots: Optional[float] = None,
    live_miles_remaining: Optional[float] = None,
) -> dict:
    delay_days = _WEATHER_DELAY.get(weather, 0.0) + _CONGESTION_DELAY.get(congestion, 0.0)

    base_transit = base_transit_days
    if live_speed_knots and live_miles_remaining is not None and live_speed_knots > 0:
        # miles_remaining / (speed * 24h) + 9 days already elapsed (mock departure)
        base_transit = 9 + (live_miles_remaining / (live_speed_knots * 24))

    departure = datetime.utcnow() - timedelta(days=9)
    total_transit = base_transit + delay_days
    arrival = departure + timedelta(days=total_transit)

    confidence = max(40, int(96 - weather * 12 - congestion * 10))

    return {
        "predicted_date": arrival.date(),
        "delay_days": round(delay_days, 1),
        "confidence": confidence,
        "progress_pct": progress_pct,
        "base_transit_days": round(base_transit, 2),
    }


# ---------------------------------------------------------------------------
# Container load planner (greedy 3D bin packing heuristic)
# ---------------------------------------------------------------------------
_CONTAINER_INNER = {
    # length, width, height (metres) - inner usable dims
    "20ft": (5.90, 2.35, 2.39),
    "40ft": (12.03, 2.35, 2.39),
}


def compute_packing(
    *,
    container_size: str,
    cartons: dict,
    pallets: dict,
) -> dict:
    cL, cW, cH = _CONTAINER_INNER.get(container_size, _CONTAINER_INNER["40ft"])

    box = {
        "length": cartons["length_cm"] / 100.0,
        "width": cartons["width_cm"] / 100.0,
        "height": cartons["height_cm"] / 100.0,
        "weight": cartons["weight_kg"],
        "qty": max(0, cartons["qty"]),
    }
    pallet = {
        "length": pallets["length_cm"] / 100.0,
        "width": pallets["width_cm"] / 100.0,
        "height": pallets["height_cm"] / 100.0,
        "weight": pallets["weight_kg"],
        "qty": max(0, pallets["qty"]),
    }

    placed: List[dict] = []       # each: {x_center, l, w, h, weight}
    total_weight = 0.0

    # A boolean floor grid tracks which (length x width) cells pallets occupy so
    # cartons are not stacked into pallet columns. Resolution ~10cm.
    cell = 0.10
    nx = max(1, int(cL / cell))
    nz = max(1, int(cW / cell))
    pallet_floor = [[False] * nz for _ in range(nx)]

    def mark_floor(x0, z0, length, width):
        ix0, ix1 = int(x0 / cell), int((x0 + length) / cell)
        iz0, iz1 = int(z0 / cell), int((z0 + width) / cell)
        for ix in range(max(0, ix0), min(nx, ix1 + 1)):
            for iz in range(max(0, iz0), min(nz, iz1 + 1)):
                pallet_floor[ix][iz] = True

    def floor_free(x0, z0, length, width):
        ix0, ix1 = int(x0 / cell), int((x0 + length) / cell)
        iz0, iz1 = int(z0 / cell), int((z0 + width) / cell)
        for ix in range(max(0, ix0), min(nx, ix1 + 1)):
            for iz in range(max(0, iz0), min(nz, iz1 + 1)):
                if pallet_floor[ix][iz]:
                    return False
        return True

    # 1. Pallets on the floor, packed in rows along width then length.
    pallet_fit = 0
    if pallet["qty"] > 0 and pallet["length"] > 0 and pallet["width"] > 0 and pallet["height"] <= cH:
        px, pz = 0.0, 0.0
        while pallet_fit < pallet["qty"] and px + pallet["length"] <= cL:
            if pz + pallet["width"] <= cW:
                placed.append({
                    "x": px + pallet["length"] / 2,
                    "l": pallet["length"], "w": pallet["width"], "h": pallet["height"],
                    "weight": pallet["weight"],
                })
                mark_floor(px, pz, pallet["length"], pallet["width"])
                pallet_fit += 1
                total_weight += pallet["weight"]
                pz += pallet["width"]
            else:
                pz = 0.0
                px += pallet["length"]

    # 2. Cartons: stack in columns over any free (non-pallet) floor footprint.
    box_fit = 0
    if box["qty"] > 0 and min(box["length"], box["width"], box["height"]) > 0:
        stack_per_column = max(1, int(cH / box["height"]))
        bx = 0.0
        while box_fit < box["qty"] and bx + box["length"] <= cL:
            bz = 0.0
            while box_fit < box["qty"] and bz + box["width"] <= cW:
                if floor_free(bx, bz, box["length"], box["width"]):
                    for _ in range(stack_per_column):
                        if box_fit >= box["qty"]:
                            break
                        placed.append({
                            "x": bx + box["length"] / 2,
                            "l": box["length"], "w": box["width"], "h": box["height"],
                            "weight": box["weight"],
                        })
                        box_fit += 1
                        total_weight += box["weight"]
                bz += box["width"]
            bx += box["length"]

    container_vol = cL * cW * cH
    packed_vol = sum(it["l"] * it["w"] * it["h"] for it in placed)
    utilization = (packed_vol / container_vol) * 100 if container_vol else 0
    unused_vol = max(0.0, container_vol - packed_vol)

    front_weight = sum(it["weight"] for it in placed if it["x"] > cL / 2)
    aft_weight = sum(it["weight"] for it in placed if it["x"] <= cL / 2)

    balance = "Balanced (Center)"
    diff = abs(front_weight - aft_weight)
    ratio = (diff / total_weight * 100) if total_weight > 0 else 0
    if total_weight > 0 and ratio > 12:
        if front_weight > aft_weight:
            balance = f"Nose Heavy (+{ratio:.0f}% Fwd)"
        else:
            balance = f"Tail Heavy (+{ratio:.0f}% Aft)"

    return {
        "container_size": container_size,
        "container_volume_m3": round(container_vol, 3),
        "cartons_fit": box_fit,
        "cartons_requested": box["qty"],
        "pallets_fit": pallet_fit,
        "pallets_requested": pallet["qty"],
        "used_volume_m3": round(packed_vol, 3),
        "unused_volume_m3": round(unused_vol, 3),
        "space_utilization_pct": round(utilization, 1),
        "total_weight_kg": round(total_weight, 1),
        "forward_weight_kg": round(front_weight, 1),
        "aft_weight_kg": round(aft_weight, 1),
        "weight_balance": balance,
    }
