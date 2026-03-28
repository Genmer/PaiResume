package com.itwanger.pairesume.dto;

import lombok.Data;

@Data
public class UserInfoDTO {
    private Long id;
    private String email;
    private String nickname;
    private String avatar;
    private String role;

    public UserInfoDTO(Long id, String email, String nickname, String avatar, String role) {
        this.id = id;
        this.email = email;
        this.nickname = nickname;
        this.avatar = avatar;
        this.role = role;
    }
}
