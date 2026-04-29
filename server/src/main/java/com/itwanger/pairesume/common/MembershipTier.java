package com.itwanger.pairesume.common;

import lombok.Getter;

@Getter
public enum MembershipTier {
    FREE("免费版", 3, 3, "SUMMARY", "BASIC"),
    LITE("基础版", 10, 10, "DETAILED", "FULL"),
    PRO("专业版", 50, 100, "DETAILED", "FULL"),
    MAX("旗舰版", 200, 300, "DETAILED", "FULL");

    private final String displayName;
    private final int jdParseLimit;
    private final int mockInterviewLimit;
    private final String errorCheckLevel;
    private final String atsCheckLevel;

    MembershipTier(String displayName, int jdParseLimit, int mockInterviewLimit, String errorCheckLevel, String atsCheckLevel) {
        this.displayName = displayName;
        this.jdParseLimit = jdParseLimit;
        this.mockInterviewLimit = mockInterviewLimit;
        this.errorCheckLevel = errorCheckLevel;
        this.atsCheckLevel = atsCheckLevel;
    }

    public boolean isUnlimited() {
        return jdParseLimit == -1;
    }

    public static MembershipTier fromStatus(String status) {
        if (status == null) return FREE;
        try {
            return valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            if ("ACTIVE".equalsIgnoreCase(status)) {
                return LITE;
            }
            if ("EXPIRED".equalsIgnoreCase(status)) {
                return FREE;
            }
            return FREE;
        }
    }
}
