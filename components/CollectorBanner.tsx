import Link from "next/link";
import styled from "styled-components";
import { revealSection } from "./homeStyles";

const Section = styled.section`
  ${revealSection(260)}
  border-top: 1px solid #1a1a1a;
  border-bottom: 1px solid #1a1a1a;
  background: #0a0a0a;
  padding: 80px 48px;
  text-align: center;

  @media (max-width: 768px) {
    padding: 64px 24px;
  }
`;

const Inner = styled.div`
  width: min(100%, 1100px);
  margin: 0 auto;
`;

const Label = styled.p`
  margin: 0;
  color: #e85d00;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 4px;
  text-transform: uppercase;
`;

const Title = styled.h2`
  margin: 16px 0 0;
  color: #ffffff;
  font-size: clamp(32px, 5vw, 48px);
  font-weight: 900;
  letter-spacing: -0.03em;
`;

const Steps = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
  margin-top: 48px;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 30px;
  }
`;

const Step = styled.div`
  position: relative;
  padding: 0 30px;

  &:not(:last-child)::after {
    content: "";
    position: absolute;
    top: 20px;
    right: -15%;
    width: 30%;
    height: 1px;
    background: #333333;
  }

  @media (max-width: 700px) {
    &:not(:last-child)::after {
      display: none;
    }
  }
`;

const Number = styled.span`
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  margin: 0 auto;
  border: 1px solid #e85d00;
  border-radius: 50%;
  color: #e85d00;
  font-size: 12px;
  font-weight: 800;
`;

const StepTitle = styled.h3`
  margin: 16px 0 0;
  color: #ffffff;
  font-size: 15px;
  font-weight: 700;
`;

const StepText = styled.p`
  margin: 8px auto 0;
  color: #666666;
  font-size: 12px;
  line-height: 1.6;
`;

const Cta = styled(Link)`
  display: inline-flex;
  margin-top: 42px;
  color: #e85d00;
  font-size: 13px;
  font-weight: 800;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;

const steps = [
  ["01", "Mua hàng", "Chọn sản phẩm Vanie chính hãng trên cửa hàng."],
  ["02", "Nhận mã", "Mỗi đơn hợp lệ đi kèm một mã collector riêng."],
  ["03", "Mở thưởng game", "Hoàn thiện bộ sưu tập để nhận phần thưởng."],
];

export default function CollectorBanner() {
  return (
    <Section>
      <Inner>
        <Label>Hệ thống collector</Label>
        <Title>Sưu tập · Nhận thưởng · Chinh phục</Title>
        <Steps>
          {steps.map(([number, title, text]) => (
            <Step key={number}>
              <Number>{number}</Number>
              <StepTitle>{title}</StepTitle>
              <StepText>{text}</StepText>
            </Step>
          ))}
        </Steps>
        <Cta href="/account/collection" prefetch={false}>Tìm hiểu cách hoạt động</Cta>
      </Inner>
    </Section>
  );
}
