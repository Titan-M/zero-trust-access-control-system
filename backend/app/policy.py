def policy_decision(risk_score: float) -> tuple[str, str]:
    if risk_score >= 70:
        return "DENY", "High risk detected. Access denied."
    if risk_score >= 35:
        return "MFA_REQUIRED", "Moderate risk detected. Additional verification required."
    return "ALLOW", "Low risk detected. Access granted."

