package com.itwanger.pairesume.util;

/**
 * 邮件 HTML 模板工具类
 */
public class MailTemplate {

    private static final String BRAND_COLOR = "#4F46E5";
    private static final String BRAND_NAME = "派简历";

    /**
     * 生成验证码邮件 HTML
     */
    public static String verificationCode(String code) {
        return """
                <!DOCTYPE html>
                <html lang="zh-CN">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>%s - 注册验证码</title>
                </head>
                <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                    <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f3f4f6;">
                        <tr>
                            <td align="center" style="padding: 40px 20px;">
                                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                                    <!-- Header -->
                                    <tr>
                                        <td style="padding: 32px 40px 24px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                                            <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: %s;">%s</h1>
                                        </td>
                                    </tr>
                                    <!-- Content -->
                                    <tr>
                                        <td style="padding: 32px 40px;">
                                            <p style="margin: 0 0 24px; font-size: 16px; color: #374151; line-height: 1.6;">
                                                你好，
                                            </p>
                                            <p style="margin: 0 0 32px; font-size: 16px; color: #374151; line-height: 1.6;">
                                                你正在注册%s账号，以下是你的验证码：
                                            </p>
                                            <!-- Code Box -->
                                            <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0">
                                                <tr>
                                                    <td align="center" style="padding: 24px; background-color: #f9fafb; border-radius: 8px; border: 2px dashed #e5e7eb;">
                                                        <span style="font-size: 36px; font-weight: 700; color: %s; letter-spacing: 8px; font-family: 'Courier New', monospace;">%s</span>
                                                    </td>
                                                </tr>
                                            </table>
                                            <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                                                验证码 5 分钟内有效，请勿泄露给他人。
                                            </p>
                                            <p style="margin: 16px 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                                                如非本人操作，请忽略这封邮件。
                                            </p>
                                        </td>
                                    </tr>
                                    <!-- Footer -->
                                    <tr>
                                        <td style="padding: 24px 40px 32px; border-top: 1px solid #e5e7eb;">
                                            <p style="margin: 0; font-size: 13px; color: #9ca3af; text-align: center; line-height: 1.5;">
                                                此邮件由系统自动发送，请勿回复<br>
                                                &copy; %s %s. All rights reserved.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
                """.formatted(
                BRAND_NAME,
                BRAND_COLOR,
                BRAND_NAME,
                BRAND_NAME,
                BRAND_COLOR,
                code,
                java.time.Year.now().getValue(),
                BRAND_NAME
        );
    }

    /**
     * 生成优惠码邮件 HTML
     */
    public static String couponCode(String couponCode, String amountText) {
        return """
                <!DOCTYPE html>
                <html lang="zh-CN">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>%s - 优惠码</title>
                </head>
                <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                    <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f3f4f6;">
                        <tr>
                            <td align="center" style="padding: 40px 20px;">
                                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
                                    <!-- Header -->
                                    <tr>
                                        <td style="padding: 32px 40px 24px; text-align: center; border-bottom: 1px solid #e5e7eb;">
                                            <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: %s;">%s</h1>
                                        </td>
                                    </tr>
                                    <!-- Content -->
                                    <tr>
                                        <td style="padding: 32px 40px;">
                                            <p style="margin: 0 0 24px; font-size: 16px; color: #374151; line-height: 1.6;">
                                                你好，
                                            </p>
                                            <p style="margin: 0 0 24px; font-size: 16px; color: #374151; line-height: 1.6;">
                                                感谢你提交%s问卷！以下是你的专属优惠码：
                                            </p>
                                            <!-- Coupon Box -->
                                            <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0">
                                                <tr>
                                                    <td align="center" style="padding: 24px; background-color: #fef3c7; border-radius: 8px; border: 2px dashed #f59e0b;">
                                                        <p style="margin: 0 0 8px; font-size: 14px; color: #92400e;">优惠码</p>
                                                        <span style="font-size: 28px; font-weight: 700; color: #d97706; letter-spacing: 4px; font-family: 'Courier New', monospace;">%s</span>
                                                    </td>
                                                </tr>
                                            </table>
                                            <!-- Amount -->
                                            <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 24px;">
                                                <tr>
                                                    <td align="center" style="padding: 16px; background-color: #ecfdf5; border-radius: 8px;">
                                                        <p style="margin: 0; font-size: 14px; color: #065f46;">可减免金额</p>
                                                        <p style="margin: 8px 0 0; font-size: 32px; font-weight: 700; color: #059669;">%s</p>
                                                    </td>
                                                </tr>
                                            </table>
                                            <p style="margin: 24px 0 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                                                支付功能上线前，如需开通会员，请联系管理员人工处理。
                                            </p>
                                        </td>
                                    </tr>
                                    <!-- Footer -->
                                    <tr>
                                        <td style="padding: 24px 40px 32px; border-top: 1px solid #e5e7eb;">
                                            <p style="margin: 0; font-size: 13px; color: #9ca3af; text-align: center; line-height: 1.5;">
                                                此邮件由系统自动发送，请勿回复<br>
                                                &copy; %s %s. All rights reserved.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
                """.formatted(
                BRAND_NAME,
                BRAND_COLOR,
                BRAND_NAME,
                BRAND_NAME,
                couponCode,
                amountText,
                java.time.Year.now().getValue(),
                BRAND_NAME
        );
    }
}
