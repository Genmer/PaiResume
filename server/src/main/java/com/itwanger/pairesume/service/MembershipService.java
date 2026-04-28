package com.itwanger.pairesume.service;

import com.itwanger.pairesume.dto.CouponQuoteDTO;
import com.itwanger.pairesume.dto.UserAdminDTO;

import java.util.List;

public interface MembershipService {
    CouponQuoteDTO quote(String couponCode);

    List<UserAdminDTO> listUsers();

    UserAdminDTO grantMembership(Long userId, Long adminUserId, String tier, int durationDays);

    UserAdminDTO revokeMembership(Long userId, Long adminUserId);
}
