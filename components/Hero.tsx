"use client";

import Image from "next/image";
import styled, { keyframes } from "styled-components";
import { MDiv, MotionProvider, smoothEase } from "./design-system";
import { fallbackMerchProducts, toMerchProduct } from "@/lib/merchCatalog";
import { useI18n } from "./LanguageProvider";

const ember = keyframes`
  0% { transform: translateY(0) translateX(0) scale(1); opacity: 0.8; }
  50% { opacity: 0.5; }
  100% { transform: translateY(-400px) translateX(var(--drift)) scale(0.3); opacity: 0; }
`;

const HeroShell = styled.section`
  position: relative;
  min-height: calc(100vh - 100px);
  overflow: hidden;
  isolation: isolate;
  display: grid;
  align-items: center;
  background: #0a0a0a url("/images/backgroundshop.png") center / cover no-repeat;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -2;
    background: linear-gradient(90deg, rgba(0, 0, 0, 0.85) 0%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0.2) 100%);
  }

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      linear-gradient(180deg, rgba(0, 0, 0, 0.08), rgba(10, 10, 10, 0.82) 94%),
      radial-gradient(circle at 58% 38%, rgba(255, 106, 0, 0.16), transparent 34%);
    pointer-events: none;
  }
`;

const Ember = styled.span<{
  $left: number;
  $size: number;
  $delay: number;
  $duration: number;
  $drift: number;
  $color: string;
}>`
  position: absolute;
  left: ${({ $left }) => $left}%;
  bottom: 10%;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  color: ${({ $color }) => $color};
  box-shadow: 0 0 6px currentColor;
  opacity: 0;
  --drift: ${({ $drift }) => $drift}px;
  animation: ${ember} ${({ $duration }) => $duration}s ease-in infinite;
  animation-delay: ${({ $delay }) => $delay}s;
`;

const HeroInner = styled.div`
  width: min(100%, 1180px);
  margin: 0 auto;
  padding: clamp(3rem, 5vw, 4.5rem) clamp(1rem, 3vw, 2rem);
  display: grid;
  grid-template-columns: minmax(0, 55%) minmax(330px, 45%);
  gap: clamp(2rem, 5vw, 4rem);
  align-items: center;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    padding-top: 2rem;
  }
`;

const HeroCopy = styled(MDiv)`
  display: grid;
  align-content: center;
`;

const Eyebrow = styled.p`
  display: inline-grid;
  grid-template-columns: 40px auto 40px;
  align-items: center;
  justify-self: start;
  gap: 0.75rem;
  margin: 0 0 1.25rem;
  color: #e85d00;
  font-size: 0.6rem;
  font-weight: 900;
  letter-spacing: 0.3rem;
  text-transform: uppercase;

  &::before,
  &::after {
    content: "";
    height: 1px;
    background: rgba(255, 106, 0, 0.5);
  }
`;

const Title = styled.h1`
  margin: 0;
  color: #fff;
  font-size: clamp(2.8rem, 5.5vw, 4.8rem);
  font-style: italic;
  font-weight: 900;
  line-height: 0.9;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
  text-transform: uppercase;

  span {
    display: block;
    color: #ff6a00;
    text-shadow: 0 0 40px rgba(255, 106, 0, 0.5);
  }
`;

const Description = styled.p`
  max-width: 400px;
  margin: 1rem 0 0;
  color: rgba(255, 255, 255, 0.65);
  font-size: 1rem;
  line-height: 1.7;
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 2rem;
`;

const HeroButton = styled.a<{ $variant?: "primary" | "secondary" }>`
  height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0 2rem;
  clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%);
  background: ${({ $variant }) => ($variant === "secondary" ? "rgba(255, 255, 255, 0.06)" : "#e85d00")};
  border: ${({ $variant }) => ($variant === "secondary" ? "1px solid rgba(255, 255, 255, 0.25)" : "1px solid #e85d00")};
  color: #fff;
  font-size: 1rem;
  font-style: italic;
  font-weight: 900;
  text-decoration: none;
  text-transform: uppercase;
  transition: transform 180ms ease, background 180ms ease, border-color 180ms ease, box-shadow 180ms ease;

  &:hover {
    transform: translateY(-2px);
    background: ${({ $variant }) => ($variant === "secondary" ? "rgba(255, 255, 255, 0.1)" : "#ff6a00")};
    border-color: ${({ $variant }) => ($variant === "secondary" ? "rgba(255, 255, 255, 0.45)" : "#ff6a00")};
    box-shadow: ${({ $variant }) => ($variant === "secondary" ? "none" : "0 14px 30px rgba(232, 93, 0, 0.28)")};
  }

  &:focus-visible {
    outline: 2px solid #f47912;
    outline-offset: 4px;
  }
`;

const Stats = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 2rem;
  margin-top: 2.5rem;
`;

const Stat = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
`;

const StatIcon = styled.span`
  width: 28px;
  height: 28px;
  display: inline-grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(255, 106, 0, 0.15);
  border: 1px solid rgba(255, 106, 0, 0.3);
  color: #e85d00;
  font-size: 0.78rem;
`;

const StatText = styled.span`
  display: grid;

  strong {
    color: #fff;
    font-size: 0.88rem;
    font-weight: 900;
  }

  span {
    color: rgba(255, 255, 255, 0.45);
    font-size: 0.62rem;
    letter-spacing: 0.06rem;
    text-transform: uppercase;
  }
`;

const Showcase = styled(MDiv)`
  display: grid;
  grid-template-rows: minmax(220px, 1fr) auto;
  gap: 1rem;

  @media (max-width: 900px) {
    grid-template-rows: auto;
  }
`;

const BigCard = styled(MDiv)`
  position: relative;
  min-height: 220px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.2rem;
  padding: 1.5rem;
  overflow: hidden;
  background: rgba(10, 10, 10, 0.88);
  border: 1px solid rgba(255, 106, 0, 0.25);
  border-radius: 8px;
  backdrop-filter: blur(8px);
  box-shadow: 0 0 34px rgba(232, 93, 0, 0.12), 0 18px 42px rgba(0, 0, 0, 0.48);

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 80% 30%, rgba(255, 106, 0, 0.15), transparent 36%);
    pointer-events: none;
  }
`;

const CardText = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  gap: 0.48rem;
`;

const MiniLabel = styled.span`
  color: #e85d00;
  font-size: 0.72rem;
  font-weight: 900;
  letter-spacing: 0.06rem;
  text-transform: uppercase;
`;

const BigTitle = styled.h2`
  margin: 0;
  color: #fff;
  font-size: 1.6rem;
  font-style: italic;
  font-weight: 900;
  line-height: 1.1;
  text-transform: uppercase;
`;

const Subtitle = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.75rem;
`;

const Price = styled.p`
  margin: 0.3rem 0 0;
  color: #ff6a00;
  font-size: 2rem;
  font-weight: 900;
`;

const Stock = styled.span<{ $low?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  color: ${({ $low }) => ($low ? "#f59e0b" : "#22c55e")};
  font-size: 0.72rem;
  font-weight: 800;

  &::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
  }
`;

const FeatureImage = styled.div`
  position: relative;
  z-index: 1;
  width: 150px;
  height: 150px;
  flex: 0 0 150px;

  @media (max-width: 520px) {
    width: 118px;
    height: 118px;
    flex-basis: 118px;
  }
`;

const FireButton = styled.span`
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 2;
  width: 36px;
  height: 36px;
  display: inline-grid;
  place-items: center;
  border-radius: 4px;
  background: rgba(232, 93, 0, 0.82);
  box-shadow: 0 0 22px rgba(232, 93, 0, 0.28);
`;

const SmallGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 520px) {
    grid-template-columns: 1fr;
  }
`;

const SmallCard = styled(MDiv)`
  min-height: 120px;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  overflow: hidden;
  background: rgba(10, 10, 10, 0.88);
  border: 1px solid rgba(255, 106, 0, 0.25);
  border-radius: 8px;
  backdrop-filter: blur(8px);
`;

const SmallImage = styled.div`
  position: relative;
  width: 88px;
  height: 88px;
  flex: 0 0 88px;
`;

const SmallTitle = styled.h3`
  margin: 0;
  color: #fff;
  font-size: 0.88rem;
  font-weight: 800;
  line-height: 1.2;
`;

const SmallPrice = styled.p`
  margin: 0.3rem 0;
  color: #ff6a00;
  font-size: 1.1rem;
  font-weight: 900;
`;

const particles = [
  [8, 3, 0.2, 6.4, -45, "#e85d00"],
  [18, 4, 1.4, 7.8, 36, "#ff6a00"],
  [26, 2, 2.1, 5.8, -28, "rgba(255,150,0,0.8)"],
  [34, 5, 0.8, 8.6, 52, "#e85d00"],
  [42, 3, 3.5, 6.9, -60, "#ff6a00"],
  [51, 2, 1.9, 5.5, 22, "rgba(255,150,0,0.8)"],
  [58, 4, 4.2, 8.1, -34, "#e85d00"],
  [63, 3, 2.8, 7.2, 48, "#ff6a00"],
  [69, 5, 0.6, 8.8, -18, "rgba(255,150,0,0.8)"],
  [75, 2, 5.4, 6.2, 60, "#e85d00"],
  [81, 4, 3.1, 7.5, -42, "#ff6a00"],
  [87, 3, 1.1, 6.7, 30, "rgba(255,150,0,0.8)"],
  [93, 2, 4.7, 5.9, -25, "#e85d00"],
  [47, 5, 6.3, 8.9, 55, "#ff6a00"],
  [13, 2, 5.8, 6.1, -33, "rgba(255,150,0,0.8)"],
] as const;

const imageSrc = (product: Product) => (product.mainImage ? `/${product.mainImage}` : "/product_placeholder.jpg");
const Hero = ({ products = [] }: { products?: Product[] }) => {
  const { t } = useI18n();
  const showcaseProducts = [...products]
    .sort((a, b) => Number(Boolean(b.isCollector)) - Number(Boolean(a.isCollector)))
    .slice(0, 3)
    .map((product, index) => toMerchProduct(product, index));
  const displayProducts = showcaseProducts.length >= 3 ? showcaseProducts : fallbackMerchProducts;
  const [featured, smallOne, smallTwo] = displayProducts;

  return (
    <MotionProvider>
      <HeroShell>
        {particles.map(([left, size, delay, duration, drift, color], index) => (
          <Ember key={index} $left={left} $size={size} $delay={delay} $duration={duration} $drift={drift} $color={color} />
        ))}
        <HeroInner>
          <HeroCopy
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: smoothEase }}
          >
            <Eyebrow>{t("hero.eyebrow")}</Eyebrow>
            <Title>
              {t("hero.title1")}
              <span>{t("hero.title2")}</span>
            </Title>
            <Description>{t("hero.description")}</Description>
            <ButtonRow>
              <HeroButton href="/shop">{t("hero.primary")} <span aria-hidden="true">{"\u2192"}</span></HeroButton>
              <HeroButton href="/shop" $variant="secondary">
                {t("hero.secondary")} <span aria-hidden="true">{"\u2192"}</span>
              </HeroButton>
            </ButtonRow>
            <Stats aria-label="Store statistics">
              {[
                ["10K+", t("hero.statCustomers"), "\u2637"],
                ["200+", t("hero.statProducts"), "\u26E8"],
                ["24/7", t("hero.statSupport"), "\u23F1"],
              ].map(([value, label, icon]) => (
                <Stat key={value}>
                  <StatIcon aria-hidden="true">{icon}</StatIcon>
                  <StatText>
                    <strong>{value}</strong>
                    <span>{label}</span>
                  </StatText>
                </Stat>
              ))}
            </Stats>
          </HeroCopy>

          <Showcase
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: smoothEase }}
          >
            <BigCard whileHover={{ y: -4, scale: 1.01 }} transition={{ duration: 0.2 }}>
              <CardText>
                <MiniLabel>{t("hero.featured")}</MiniLabel>
                <BigTitle>{featured.title}</BigTitle>
                <Subtitle>{featured.description || featured.manufacturer || "Limited Edition"}</Subtitle>
                <Price>${featured.price}</Price>
                <Stock $low={featured.inStock <= 5}>
                  {featured.inStock <= 5 ? `${t("product.lowStock")} (${featured.inStock})` : t("product.inStock")}
                </Stock>
              </CardText>
              <FeatureImage>
                <Image src={imageSrc(featured)} alt={featured.title} fill sizes="150px" style={{ objectFit: "contain" }} />
              </FeatureImage>
              <FireButton aria-hidden="true">{"\uD83D\uDD25"}</FireButton>
            </BigCard>
            <SmallGrid>
              {[smallOne, smallTwo].map((product, index) => (
                <SmallCard key={product.id} whileHover={{ y: -3, scale: 1.01 }} transition={{ duration: 0.2, delay: index * 0.04 }}>
                  <SmallImage>
                    <Image src={imageSrc(product)} alt={product.title} fill sizes="88px" style={{ objectFit: "contain" }} />
                  </SmallImage>
                  <div>
                    <SmallTitle>{product.title}</SmallTitle>
                    <SmallPrice>${product.price}</SmallPrice>
                    <Stock $low={product.inStock <= 5}>
                      {product.inStock <= 5 ? `${t("product.lowStock")} (${product.inStock})` : t("product.inStock")}
                    </Stock>
                  </div>
                </SmallCard>
              ))}
            </SmallGrid>
          </Showcase>
        </HeroInner>
      </HeroShell>
    </MotionProvider>
  );
};

export default Hero;
