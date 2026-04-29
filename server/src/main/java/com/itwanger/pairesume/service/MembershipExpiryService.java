package com.itwanger.pairesume.service;

/**
 * 会员到期自动降级服务（懒惰检查模式）。
 * 在用户查询会员状态时触发检查，而非定时任务。
 */
public interface MembershipExpiryService {

    /**
     * 检查单个用户是否会员已过期，若过期则自动降级为 FREE。
     *
     * @param userId 用户 ID
     */
    void checkAndDowngradeExpiredUser(Long userId);

    /**
     * 批量检查所有已过期用户并降级（可选，供管理接口调用）。
     */
    void checkAndDowngradeAllExpired();
}