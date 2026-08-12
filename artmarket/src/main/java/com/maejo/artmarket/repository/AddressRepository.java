package com.maejo.artmarket.repository;

import com.maejo.artmarket.entity.Address;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AddressRepository extends JpaRepository<Address, Integer> {
    List<Address> findByUser_UserId(Integer userId);
}
