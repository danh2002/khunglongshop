"use client";

import styled, { keyframes } from "styled-components";

const scroll = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
`;

const Bar = styled.section`
  overflow: hidden;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(90deg, rgba(232, 93, 0, 0.92), rgba(255, 106, 0, 0.86)),
    #e85d00;
  color: #ffffff;
`;

const Track = styled.div`
  display: flex;
  width: max-content;
  animation: ${scroll} 26s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const Item = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 24px;
  padding: 8px 22px;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 2.6px;
  white-space: nowrap;
  text-transform: uppercase;

  &::after {
    content: "";
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.74);
  }
`;

const messages = [
  "Vanie blind box",
  "Bộ sưu tập giới hạn",
  "Giao hàng toàn quốc",
  "Mã collector độc quyền",
  "Designer toy drop",
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
