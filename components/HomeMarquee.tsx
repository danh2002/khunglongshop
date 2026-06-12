"use client";

import styled, { keyframes } from "styled-components";

const scroll = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
`;

const Bar = styled.section`
  overflow: hidden;
  background: #e85d00;
  color: #ffffff;
`;

const Track = styled.div`
  display: flex;
  width: max-content;
  animation: ${scroll} 24s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Item = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 28px;
  padding: 10px 22px;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 2px;
  white-space: nowrap;
  text-transform: uppercase;

  &::after {
    content: "";
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.72);
  }
`;

const messages = [
  "Vanie blind box",
  "Bộ sưu tập giới hạn",
  "Giao hàng toàn quốc",
  "Mã collector độc quyền",
  "Vanie blind box",
];

export default function HomeMarquee() {
  const repeated = [...messages, ...messages];

  return (
    <Bar aria-label="Điểm nổi bật">
      <Track>
        {repeated.map((message, index) => (
          <Item key={`${message}-${index}`}>{message}</Item>
        ))}
      </Track>
    </Bar>
  );
}
