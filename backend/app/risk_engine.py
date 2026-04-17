import ipaddress

# Dynamic weights allow admins to tune the Zero-Trust algorithm in real-time
ALGORITHM_WEIGHTS = {
    "untrusted_device": 45,
    "external_network": 20,
    "invalid_ip": 25,
    "outside_hours": 20,
    "admin_violation": 35,
    "untrusted_admin": 15,
    "malicious_ip": 60,
}

KNOWN_MALICIOUS_IPS = {"103.25.67.12", "185.199.108.153", "8.8.4.4"}

def get_weights():
    return ALGORITHM_WEIGHTS

def update_weights(new_weights: dict):
    for k, v in new_weights.items():
        if k in ALGORITHM_WEIGHTS and isinstance(v, (int, float)):
            ALGORITHM_WEIGHTS[k] = v

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

    # Threat Intelligence mock logic
    if ip_address in KNOWN_MALICIOUS_IPS:
        score += ALGORITHM_WEIGHTS["malicious_ip"]
        reasons.append("Threat Intel: Malicious IP detected")

    if device_status.lower() != "trusted":
        score += ALGORITHM_WEIGHTS["untrusted_device"]
        reasons.append("Untrusted device")

    try:
        ip_obj = ipaddress.ip_address(ip_address)
        if not ip_obj.is_private and not ip_obj.is_loopback:
            score += ALGORITHM_WEIGHTS["external_network"]
            reasons.append("External network access")
    except ValueError:
        score += ALGORITHM_WEIGHTS["invalid_ip"]
        reasons.append("Invalid source IP format")

    if not _is_business_hours(access_time):
        score += ALGORITHM_WEIGHTS["outside_hours"]
        reasons.append("Outside business hours")

    if endpoint.startswith("/admin") and role.lower() != "admin":
        score += ALGORITHM_WEIGHTS["admin_violation"]
        reasons.append("Non-admin attempting admin endpoint")

    if role.lower() == "admin" and device_status.lower() != "trusted":
        score += ALGORITHM_WEIGHTS["untrusted_admin"]
        reasons.append("Admin action from untrusted device")

    if recent_denials > 0:
        score += min(20, recent_denials * 5)
        reasons.append(f"Recent denied attempts ({recent_denials}x)")

    if not reasons:
        reasons.append("Normal contextual behavior")

    return min(score, 100.0), ", ".join(reasons)
