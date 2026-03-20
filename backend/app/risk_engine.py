import ipaddress


def _is_business_hours(access_time: str) -> bool:
    try:
        hour = int(access_time.split(":")[0])
        minute = int(access_time.split(":")[1])
    except (ValueError, IndexError):
        return False
    if minute < 0 or minute > 59:
        return False
    return 7 <= hour <= 20


def calculate_risk_score(
    role: str,
    ip_address: str,
    device_status: str,
    access_time: str,
    endpoint: str,
    recent_denials: int = 0,
) -> tuple[float, str]:
    score = 0.0
    reasons: list[str] = []

    if device_status.lower() != "trusted":
        score += 45
        reasons.append("Untrusted device")

    try:
        ip_obj = ipaddress.ip_address(ip_address)
        if not ip_obj.is_private and not ip_obj.is_loopback:
            score += 20
            reasons.append("External network access")
    except ValueError:
        score += 25
        reasons.append("Invalid source IP format")

    if not _is_business_hours(access_time):
        score += 20
        reasons.append("Outside business hours")

    if endpoint.startswith("/admin") and role.lower() != "admin":
        score += 35
        reasons.append("Non-admin attempting admin endpoint")

    if role.lower() == "admin" and device_status.lower() != "trusted":
        score += 15
        reasons.append("Admin action from untrusted device")

    if recent_denials > 0:
        score += min(20, recent_denials * 5)
        reasons.append(f"Recent denied attempts: {recent_denials}")

    if not reasons:
        reasons.append("Normal contextual behavior")

    return min(score, 100.0), ", ".join(reasons)
