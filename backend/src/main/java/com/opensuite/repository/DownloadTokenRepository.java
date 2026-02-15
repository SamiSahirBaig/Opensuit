package com.opensuite.repository;

import com.opensuite.model.DownloadToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface DownloadTokenRepository extends JpaRepository<DownloadToken, String> {

    Optional<DownloadToken> findByToken(String token);

    List<DownloadToken> findByExpiresAtBefore(LocalDateTime dateTime);

    void deleteByExpiresAtBefore(LocalDateTime dateTime);
}
