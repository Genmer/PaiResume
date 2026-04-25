package com.itwanger.pairesume.service.impl;

import com.itwanger.pairesume.common.BusinessException;
import com.itwanger.pairesume.common.ResultCode;
import com.itwanger.pairesume.service.MailService;
import com.itwanger.pairesume.util.MailTemplate;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Slf4j
@Service
@RequiredArgsConstructor
public class MailServiceImpl implements MailService {
    private final JavaMailSender javaMailSender;

    @Value("${app.environment:development}")
    private String appEnvironment;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    @Override
    public void sendVerificationCode(String email, String code) {
        String html = MailTemplate.verificationCode(code);
        sendHtmlMail(
                email,
                "派简历注册验证码",
                html,
                "verification code " + code + " for " + email
        );
    }

    @Override
    public void sendCouponCode(String email, String couponCode, int amountCents) {
        String amountText = formatCents(amountCents);
        String html = MailTemplate.couponCode(couponCode, amountText);
        sendHtmlMail(
                email,
                "派简历优惠码",
                html,
                "coupon " + couponCode + " (" + amountText + ") for " + email
        );
    }

    private void sendHtmlMail(String to, String subject, String htmlContent, String fallbackLogText) {
        if (!StringUtils.hasText(mailUsername) || !StringUtils.hasText(mailPassword)) {
            fallbackOrThrow(fallbackLogText, null);
            return;
        }

        try {
            MimeMessage message = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(mailUsername);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            javaMailSender.send(message);
        } catch (Exception e) {
            fallbackOrThrow(fallbackLogText, e);
        }
    }

    private void fallbackOrThrow(String fallbackLogText, Exception error) {
        if ("development".equalsIgnoreCase(appEnvironment)) {
            if (error == null) {
                log.info("Mail fallback in development: {}", fallbackLogText);
            } else {
                log.warn("Mail send failed in development, fallback to log: {}", fallbackLogText, error);
            }
            return;
        }

        if (error == null) {
            throw new BusinessException(ResultCode.MAIL_NOT_CONFIGURED);
        }
        throw new BusinessException(ResultCode.MAIL_SEND_FAILED);
    }

    private String formatCents(int amountCents) {
        return String.format("¥%.2f", amountCents / 100.0);
    }
}
