
import React from 'react';

export const formatVND = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

export const formatNumberWithDots = (value: string | number) => {
  if (!value) return '';
  const num = value.toString().replace(/\D/g, '');
  return num.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export const parseNumberFromDots = (value: string) => {
  return value.replace(/\./g, '');
};

export const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('vi-VN', { hour12: false });
};
