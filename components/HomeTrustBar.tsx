import styled from "styled-components";
import { revealSection } from "./homeStyles";

const Section = styled.section`
  ${revealSection(360)}
  background: #070707;
  padding: 0 24px 80px;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1px;
  width: min(100%, 1280px);
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid #1e1e1e;
  border-radius: 16px;
  background: #1e1e1e;

  @media (max-width: 760px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 430px) {
    grid-template-columns: minmax(0, 1fr);
  }
`;

const Item = styled.div`
  display: grid;
  justify-items: center;
  gap: 9px;
  background: #0d0d0d;
  padding: 32px 24px;
  text-align: center;
`;

const Index = styled.span`
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid #333333;
  border-radius: 50%;
  color: #e85d00;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1px;
`;

const Title = styled.strong`
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
`;

const Subtitle = styled.span`
  color: #666666;
  font-size: 12px;
`;

const items = [
  ["01", "Thanh toán an toàn", "Mã hóa SSL 256-bit"],
  ["02", "Giao hàng toàn quốc", "2-5 ngày làm việc"],
  ["03", "Đổi trả 7 ngày", "Hoàn tiền 100% nếu lỗi"],
  ["04", "Mã game độc quyền", "Mỗi đơn hàng có mã collector"],
];

export default function HomeTrustBar() {
  return (
    <Section>
      <Grid>
        {items.map(([index, title, subtitle]) => (
          <Item key={title}>
            <Index aria-hidden="true">{index}</Index>
            <Title>{title}</Title>
            <Subtitle>{subtitle}</Subtitle>
          </Item>
        ))}
      </Grid>
    </Section>
  );
}
