package lk.medicare.dto;

import jakarta.validation.constraints.Pattern;

public record PaymentRequest(
        @Pattern(regexp = ValidationPatterns.PAYMENT_METHOD, message = "must be CASH, CARD, ONLINE or INSURANCE")
        String paymentMethod) {
}
