import Link from "next/link";
import styled from "styled-components";

const accent = "#e85d00";

const Page = styled.main`
  min-height: 100vh;
  background: #070707;
  color: #ffffff;
`;

const HeroSection = styled.section`
  position: relative;
  height: 340px;
  overflow: hidden;
  background: #070707;
`;

const HeroLabel = styled.div`
  position: absolute;
  top: 28px;
  left: 48px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: ${accent};
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1.8px;
  text-transform: uppercase;

  &::before {
    content: "";
    display: block;
    width: 32px;
    height: 1px;
    background: ${accent};
  }

  @media (max-width: 768px) {
    left: 24px;
  }
`;

const HeroTitle = styled.h1`
  position: absolute;
  bottom: 34px;
  left: 48px;
  margin: 0;
  color: #ffffff;
  font-size: clamp(64px, 8vw, 96px);
  font-weight: 900;
  letter-spacing: 0;
  line-height: 0.88;
  text-transform: uppercase;

  span {
    display: block;
    color: ${accent};
  }

  @media (max-width: 768px) {
    left: 24px;
    font-size: clamp(56px, 18vw, 76px);
  }
`;

const HeroSubtitle = styled.p`
  position: absolute;
  right: 48px;
  bottom: 42px;
  max-width: 320px;
  margin: 0;
  color: #555;
  font-size: 13px;
  line-height: 1.7;
  text-align: right;

  @media (max-width: 768px) {
    right: 24px;
    bottom: 18px;
    left: 24px;
    max-width: none;
    text-align: left;
  }
`;

const StorySection = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
  gap: 48px;
  padding: 64px 48px;
  background: #070707;

  > div:first-child {
    padding-right: 0;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 28px;
    padding: 48px 24px;
  }
`;

const Eyebrow = styled.p`
  margin: 0 0 12px;
  color: ${accent};
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1.8px;
  text-transform: uppercase;
`;

const SectionTitle = styled.h2`
  max-width: 520px;
  margin: 0;
  color: #ffffff;
  font-size: 32px;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1.05;
  text-transform: uppercase;

  span {
    color: ${accent};
  }
`;

const StoryBody = styled.div`
  max-width: 680px;

  p {
    margin: 0;
    color: #777;
    font-size: 14px;
    line-height: 1.9;
  }

  p + p {
    margin-top: 16px;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 24px;
`;

const Button = styled(Link)<{ $variant?: "primary" | "ghost" }>`
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  border: 1px solid
    ${({ $variant }) =>
      $variant === "primary" ? accent : "rgba(255, 255, 255, 0.14)"};
  border-radius: 6px;
  background: ${({ $variant }) =>
    $variant === "primary" ? accent : "transparent"};
  padding: 0 18px;
  color: ${({ $variant }) => ($variant === "primary" ? "#ffffff" : "#cccccc")};
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 1.2px;
  text-decoration: none;
  text-transform: uppercase;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;

  &:hover {
    border-color: ${accent};
    background: ${({ $variant }) =>
      $variant === "primary" ? "#ff6a00" : "rgba(232, 93, 0, 0.08)"};
    color: #ffffff;
    transform: translateY(-1px);
  }
`;

const StatsBar = styled.section`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border-top: 0.5px solid #111;
  border-bottom: 0.5px solid #111;
  background: #070707;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const StatCell = styled.div`
  padding: 32px 24px;
  border-right: 0.5px solid #111;
  text-align: center;

  &:last-child {
    border-right: 0;
  }

  @media (max-width: 768px) {
    border-right: 0;
    border-bottom: 0.5px solid #111;

    &:last-child {
      border-bottom: 0;
    }
  }
`;

const StatNumber = styled.p`
  margin: 0;
  color: #ffffff;
  font-size: 40px;
  font-weight: 900;
  line-height: 1;

  span {
    color: ${accent};
  }
`;

const StatLabel = styled.p`
  margin: 10px 0 0;
  color: #444;
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 1.3px;
  text-transform: uppercase;
`;

const ValuesSection = styled.section`
  padding: 64px 48px;
  background: #070707;

  @media (max-width: 768px) {
    padding: 48px 24px;
  }
`;

const SectionHeader = styled.header`
  margin-bottom: 28px;
`;

const ValueGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  background: #111;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ValueCard = styled.article`
  background: #070707;
  padding: 28px 24px;
`;

const IconBox = styled.div`
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid #1e1e1e;
  border-radius: 6px;
  background: #0f0f0f;
  color: ${accent};
  font-size: 19px;
`;

const CardTitle = styled.h3`
  margin: 22px 0 0;
  color: #ccc;
  font-size: 14px;
  font-weight: 900;
  text-transform: uppercase;
`;

const CardDescription = styled.p`
  margin: 10px 0 0;
  color: #555;
  font-size: 12px;
  line-height: 1.8;
`;

const EcosystemSection = styled.section`
  padding: 0 48px 64px;
  background: #070707;

  @media (max-width: 768px) {
    padding: 0 24px 48px;
  }
`;

const EcosystemGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  background: #111;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const EcosystemCard = styled.article`
  position: relative;
  overflow: hidden;
  background: #0d0d0d;
  padding: 32px 28px;
`;

const EcosystemLabel = styled.p`
  margin: 0;
  color: ${accent};
  font-size: 10px;
  font-weight: 900;
  letter-spacing: 1.8px;
  text-transform: uppercase;
`;

const EcosystemTitle = styled.h3`
  margin: 14px 0 0;
  color: #ffffff;
  font-size: 24px;
  font-weight: 900;
  text-transform: uppercase;
`;

const EcosystemDescription = styled.p`
  margin: 12px 0 0;
  color: #666;
  font-size: 13px;
  line-height: 1.8;
`;

const TagList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 22px;
`;

const Tag = styled.span<{ $active?: boolean }>`
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  border: 1px solid
    ${({ $active }) => ($active ? "rgba(232, 93, 0, 0.4)" : "#1e1e1e")};
  border-radius: 999px;
  background: ${({ $active }) =>
    $active ? "rgba(232, 93, 0, 0.05)" : "#0f0f0f"};
  padding: 0 12px;
  color: ${({ $active }) => ($active ? accent : "#555")};
  font-size: 11px;
  font-weight: 800;
`;

const CtaSection = styled.section`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  margin: 0 48px 64px;
  border: 0.5px solid #1a1a1a;
  border-radius: 8px;
  background: #0f0f0f;
  padding: 48px;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    margin: 0 24px 48px;
    padding: 32px 24px;
  }
`;

const CtaTitle = styled.h2`
  margin: 10px 0 0;
  color: #ffffff;
  font-size: 28px;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1.12;
  text-transform: uppercase;
`;

const CtaSubtitle = styled.p`
  max-width: 480px;
  margin: 12px 0 0;
  color: #666;
  font-size: 13px;
  line-height: 1.7;
`;

type Stat = {
  number: string;
  suffix?: string;
  label: string;
};

type Value = {
  symbol: string;
  title: string;
  description: string;
};

type Ecosystem = {
  label: string;
  title: string;
  description: string;
  tags: Array<{
    label: string;
    active?: boolean;
  }>;
};

const stats: Stat[] = [
  { number: "10", suffix: "+", label: "Nhân vật độc quyền" },
  { number: "5k", label: "Collector đã tham gia" },
  { number: "3", label: "Bộ sưu tập ra mắt" },
  { number: "100", suffix: "%", label: "Thiết kế gốc Việt Nam" },
];

const values: Value[] = [
  {
    symbol: "✦",
    title: "Thiết kế gốc",
    description:
      "Mỗi nhân vật được xây dựng từ cá tính riêng, màu sắc riêng và tinh thần vui nhộn của thế giới Đảo Khủng Long.",
  },
  {
    symbol: "◎",
    title: "Cộng đồng trước",
    description:
      "Collector, game thủ và người yêu đồ chơi là trung tâm cho mọi bộ sưu tập, sự kiện và phần thưởng.",
  },
  {
    symbol: "◆",
    title: "Chất lượng thật",
    description:
      "Từ hộp mở bất ngờ đến vật phẩm giới hạn, chúng tôi ưu tiên cảm giác cầm nắm, độ hoàn thiện và trải nghiệm lâu dài.",
  },
];

const ecosystems: Ecosystem[] = [
  {
    label: "Cửa hàng",
    title: "Mua vật phẩm thật",
    description:
      "Sưu tập blind box, phụ kiện và phiên bản giới hạn được thiết kế cho người yêu khủng long, đồ chơi và văn hóa mở hộp.",
    tags: [
      { label: "Blind Box", active: true },
      { label: "Keychain", active: true },
      { label: "Limited Edition" },
      { label: "Set Collector" },
    ],
  },
  {
    label: "Game",
    title: "Mở khóa phần thưởng",
    description:
      "Mỗi bộ sưu tập kết nối với game bằng mã redemption, nhân vật kỹ thuật số và bonus dành riêng cho collector.",
    tags: [
      { label: "Mã Redemption", active: true },
      { label: "Nhân vật Game", active: true },
      { label: "Set Bonus" },
      { label: "Collector Mode" },
    ],
  },
];

export default function AboutPage() {
  return (
    <Page>
      <HeroSection>
        <HeroLabel>Home / Giới thiệu</HeroLabel>
        <HeroTitle>
          Về
          <span>Chúng tôi</span>
        </HeroTitle>
        <HeroSubtitle>
          Đảo Khủng Long — nơi thế giới collectible gặp gỡ văn hóa gaming Việt Nam.
        </HeroSubtitle>
      </HeroSection>

      <StorySection>
        <div>
          <Eyebrow>Câu chuyện</Eyebrow>
          <SectionTitle>
            Sinh ra từ đam mê <span>Đảo Khủng Long</span>
          </SectionTitle>
        </div>
        <StoryBody>
          <p>
            Đảo Khủng Long bắt đầu từ một ý tưởng đơn giản: biến niềm vui sưu
            tập thành một trải nghiệm có câu chuyện, có nhân vật và có cộng
            đồng cùng khám phá. Mỗi sản phẩm được tạo ra để mang lại cảm giác
            háo hức khi mở hộp, giống như tìm thấy một sinh vật mới trên hòn đảo
            của riêng mình.
          </p>
          <p>
            Chúng tôi kết hợp collectible vật lý với phần thưởng trong game để
            mỗi lần mua không chỉ dừng lại ở một món đồ đẹp. Đó là một bước tiến
            trong hành trình sưu tập, mở khóa, khoe thành tựu và kết nối với
            những người cùng chung đam mê.
          </p>
          <ButtonRow>
            <Button href="/products" $variant="primary">
              Xem bộ sưu tập
            </Button>
          </ButtonRow>
        </StoryBody>
      </StorySection>

      <StatsBar>
        {stats.map((stat) => (
          <StatCell key={stat.label}>
            <StatNumber>
              {stat.number}
              {stat.suffix ? <span>{stat.suffix}</span> : null}
            </StatNumber>
            <StatLabel>{stat.label}</StatLabel>
          </StatCell>
        ))}
      </StatsBar>

      <ValuesSection>
        <SectionHeader>
          <Eyebrow>Giá trị cốt lõi</Eyebrow>
          <SectionTitle>Chúng tôi tin vào</SectionTitle>
        </SectionHeader>
        <ValueGrid>
          {values.map((value) => (
            <ValueCard key={value.title}>
              <IconBox aria-hidden="true">{value.symbol}</IconBox>
              <CardTitle>{value.title}</CardTitle>
              <CardDescription>{value.description}</CardDescription>
            </ValueCard>
          ))}
        </ValueGrid>
      </ValuesSection>

      <EcosystemSection>
        <SectionHeader>
          <Eyebrow>Hệ sinh thái</Eyebrow>
          <SectionTitle>Shop + Game = một thế giới</SectionTitle>
        </SectionHeader>
        <EcosystemGrid>
          {ecosystems.map((item) => (
            <EcosystemCard key={item.label}>
              <EcosystemLabel>{item.label}</EcosystemLabel>
              <EcosystemTitle>{item.title}</EcosystemTitle>
              <EcosystemDescription>{item.description}</EcosystemDescription>
              <TagList>
                {item.tags.map((tag) => (
                  <Tag key={tag.label} $active={tag.active}>
                    {tag.label}
                  </Tag>
                ))}
              </TagList>
            </EcosystemCard>
          ))}
        </EcosystemGrid>
      </EcosystemSection>

      <CtaSection>
        <div>
          <Eyebrow>Sẵn sàng chưa?</Eyebrow>
          <CtaTitle>Bắt đầu bộ sưu tập của bạn</CtaTitle>
          <CtaSubtitle>
            Chọn blind box đầu tiên, hoàn thiện set yêu thích và mở khóa những
            phần thưởng chỉ dành cho collector Đảo Khủng Long.
          </CtaSubtitle>
        </div>
        <ButtonRow>
          <Button href="/products" $variant="primary">
            Mua ngay
          </Button>
          <Button href="/products">Xem bộ sưu tập</Button>
        </ButtonRow>
      </CtaSection>
    </Page>
  );
}
