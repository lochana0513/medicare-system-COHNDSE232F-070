package lk.medicare.dto;

/** Regular expressions used by request validation (they mirror the database check constraints). */
public final class ValidationPatterns {

    public static final String PHONE = "^0[0-9]{9}$";
    public static final String PHONE_MESSAGE = "must be a 10 digit number starting with 0";

    public static final String NIC = "^([0-9]{9}[VvXx]|[0-9]{12})$";
    public static final String NIC_MESSAGE = "must be 9 digits followed by V/X, or 12 digits";

    public static final String TIME = "^([01][0-9]|2[0-3]):[0-5][0-9]$";
    public static final String TIME_MESSAGE = "must be in HH:MM (24 hour) format";

    public static final String DAY = "^(MON|TUE|WED|THU|FRI|SAT|SUN)$";
    public static final String DOCTOR_STATUS = "^(ACTIVE|ON_LEAVE|INACTIVE)$";
    public static final String GENDER = "^[MFO]$";
    public static final String BLOOD_GROUP = "^(|A\\+|A-|B\\+|B-|AB\\+|AB-|O\\+|O-)$";
    public static final String PAYMENT_METHOD = "^(CASH|CARD|ONLINE|INSURANCE)$";

    private ValidationPatterns() {
    }
}
