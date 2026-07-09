import Image from "next/image";
import Link from "next/link";
import styled from "styled-components";

const colors = {
  nearBlack: "#070707",
  surface: "#111111",
  elevated: "#181818",
  white: "#ffffff",
  softGray: "#a1a1aa",
  mutedGray: "#71717a",
  gold: "#d6a84f",
  orange: "#ff7a1a",
  teal: "#39d6c0",
};

const Page = styled.main`
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at 12% 8%, rgba(57, 214, 192, 0.12), transparent 30%),
    radial-gradient(circle at 82% 12%, rgba(255, 122, 26, 0.14), transparent 28%),
    ${colors.nearBlack};
  color: ${colors.white};
`;

const Section = styled.section`
  position: relative;
  padding: clamp(72px, 8vw, 128px) clamp(20px, 5vw, 72px);
`;

const Container = styled.div`
  width: min(1180px, 100%);
  margin: 0 auto;
`;

const Eyebrow = styled.p`
  margin: 0 0 16px;
  color: ${colors.gold};
  font-size: clamp(10px, 0.8vw, 12px);
  font-weight: 900;
  letter-spacing: 0.22em;
  text-transform: uppercase;
`;

const SectionTitle = styled.h2`
  max-width: 820px;
  margin: 0;
  color: ${colors.white};
  font-size: clamp(30px, 4vw, 52px);
  font-weight: 950;
  letter-spacing: 0;
  line-height: 1.02;
  text-transform: uppercase;

  span {
    color: ${colors.orange};
  }
`;

const SectionCopy = styled.p`
  max-width: 680px;
  margin: 24px 0 0;
  color: ${colors.softGray};
  font-size: clamp(15px, 1.25vw, 17px);
  line-height: 1.78;
`;

const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 32px;
`;

const Button = styled(Link)<{ $variant?: "primary" | "secondary" }>`
  display: inline-flex;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  border: 1px solid
    ${({ $variant }) =>
      $variant === "primary" ? "rgba(255, 122, 26, 0.82)" : "rgba(255, 255, 255, 0.16)"};
  border-radius: 999px;
  background: ${({ $variant }) =>
    $variant === "primary"
      ? "linear-gradient(135deg, #ff7a1a, #d6a84f)"
      : "rgba(255, 255, 255, 0.055)"};
  padding: 0 22px;
  color: ${({ $variant }) => ($variant === "primary" ? "#080808" : colors.white)};
  font-size: 13px;
  font-weight: 950;
  letter-spacing: 0.08em;
  text-decoration: none;
  text-transform: uppercase;
  box-shadow: ${({ $variant }) =>
    $variant === "primary" ? "0 18px 42px rgba(255, 122, 26, 0.24)" : "none"};
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: ${colors.gold};
    box-shadow: 0 18px 44px rgba(214, 168, 79, 0.2);
  }

  &:active {
    transform: translateY(0);
  }

  &:focus-visible {
    outline: 2px solid ${colors.teal};
    outline-offset: 4px;
  }
`;

const Hero = styled.section`
  position: relative;
  display: grid;
  min-height: calc(100vh - 64px);
  place-items: center;
  overflow: hidden;
  padding: clamp(88px, 9vw, 132px) clamp(20px, 5vw, 72px);
  background:
    linear-gradient(90deg, rgba(7, 7, 7, 0.95), rgba(7, 7, 7, 0.64) 48%, rgba(7, 7, 7, 0.86)),
    url("/images/backgroundshop.png") center / cover;

  &::after {
    content: "";
    position: absolute;
    inset: auto 0 0;
    height: 180px;
    background: linear-gradient(180deg, transparent, ${colors.nearBlack});
    pointer-events: none;
  }
`;

const HeroGrid = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  width: min(1180px, 100%);
  grid-template-columns: minmax(0, 0.98fr) minmax(340px, 1.02fr);
  gap: clamp(40px, 7vw, 96px);
  align-items: center;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const HeroContent = styled.div`
  animation: riseIn 0.72s ease both;
`;

const HeroTitle = styled.h1`
  max-width: 660px;
  margin: 0;
  font-size: clamp(44px, 5.8vw, 76px);
  font-weight: 950;
  letter-spacing: 0;
  line-height: 1.05;
  text-transform: uppercase;

  span {
    display: block;
    color: ${colors.orange};
  }
`;

const HeroLead = styled.p`
  max-width: 560px;
  margin: 24px 0 0;
  color: rgba(255, 255, 255, 0.78);
  font-size: clamp(15px, 1.24vw, 18px);
  line-height: 1.76;
`;

const HeroVisual = styled.div`
  position: relative;
  min-height: 560px;
  animation: floatIn 0.9s ease 0.08s both;

  @media (max-width: 900px) {
    min-height: 420px;
  }
`;

const ProductOrb = styled.div`
  position: absolute;
  inset: 42px 8% 28px;
  border: 1px solid rgba(214, 168, 79, 0.24);
  border-radius: 32px;
  background:
    radial-gradient(circle at 50% 20%, rgba(214, 168, 79, 0.28), transparent 34%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.025));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.16),
    0 32px 86px rgba(0, 0, 0, 0.58);
  overflow: hidden;
`;

const HeroImageWrap = styled.div`
  position: absolute;
  inset: 24px;

  img {
    object-fit: contain;
    filter: drop-shadow(0 34px 56px rgba(0, 0, 0, 0.72));
  }
`;

const FloatingTag = styled.div<{ $top?: string; $left?: string; $right?: string; $delay?: string }>`
  position: absolute;
  top: ${({ $top }) => $top ?? "auto"};
  left: ${({ $left }) => $left ?? "auto"};
  right: ${({ $right }) => $right ?? "auto"};
  z-index: 2;
  min-width: 154px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 18px;
  background: rgba(10, 10, 10, 0.72);
  backdrop-filter: blur(18px);
  padding: 14px 16px;
  box-shadow: 0 20px 54px rgba(0, 0, 0, 0.42);
  animation: drift 5s ease-in-out ${({ $delay }) => $delay ?? "0s"} infinite;

  strong {
    display: block;
    color: ${colors.white};
    font-size: 18px;
    line-height: 1;
  }

  span {
    display: block;
    margin-top: 6px;
    color: ${colors.softGray};
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
`;

const ScrollHint = styled.a`
  position: absolute;
  bottom: 32px;
  left: 50%;
  z-index: 2;
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 10px;
  color: rgba(255, 255, 255, 0.56);
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-decoration: none;
  text-transform: uppercase;
  transform: translateX(-50%);

  &::before {
    content: "";
    width: 1px;
    height: 32px;
    background: linear-gradient(${colors.gold}, transparent);
  }
`;

const MissionGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: clamp(32px, 6vw, 80px);
  align-items: start;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const Manifesto = styled.blockquote`
  margin: 0;
  border-left: 2px solid ${colors.orange};
  padding: 8px 0 8px 28px;
  color: ${colors.white};
  font-size: clamp(26px, 4vw, 48px);
  font-weight: 900;
  line-height: 1.08;
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 40px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const FeatureCard = styled.article`
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.025)),
    ${colors.surface};
  padding: 24px;
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;

  &:hover {
    border-color: rgba(214, 168, 79, 0.42);
    box-shadow: 0 24px 58px rgba(0, 0, 0, 0.34);
    transform: translateY(-4px);
  }
`;

const IconMark = styled.span`
  display: inline-grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid rgba(57, 214, 192, 0.28);
  border-radius: 14px;
  background: rgba(57, 214, 192, 0.08);
  color: ${colors.teal};
  font-weight: 950;
`;

const CardTitle = styled.h3`
  margin: 22px 0 0;
  color: ${colors.white};
  font-size: 20px;
  font-weight: 950;
  line-height: 1.16;
`;

const CardCopy = styled.p`
  margin: 12px 0 0;
  color: ${colors.softGray};
  font-size: 14px;
  line-height: 1.76;
`;

const StoryPanel = styled.div`
  display: grid;
  gap: 28px;
`;

const StoryRow = styled.article<{ $reverse?: boolean }>`
  display: grid;
  grid-template-columns: ${({ $reverse }) => ($reverse ? "1fr 0.8fr" : "0.8fr 1fr")};
  gap: clamp(24px, 5vw, 56px);
  align-items: center;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const CinematicImage = styled.div`
  position: relative;
  min-height: 420px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 28px;
  background: ${colors.surface};
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.42);

  img {
    object-fit: cover;
    transition: transform 0.6s ease;
  }

  &:hover img {
    transform: scale(1.04);
  }
`;

const StoryText = styled.div`
  h3 {
    margin: 0;
    color: ${colors.white};
    font-size: clamp(28px, 4vw, 48px);
    font-weight: 950;
    line-height: 1;
    text-transform: uppercase;
  }

  p {
    margin: 20px 0 0;
    color: ${colors.softGray};
    font-size: 16px;
    line-height: 1.86;
  }
`;

const PullQuote = styled.p`
  margin: 28px 0 0;
  border-top: 1px solid rgba(214, 168, 79, 0.26);
  padding-top: 22px;
  color: ${colors.gold};
  font-size: 18px;
  font-weight: 900;
  line-height: 1.48;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 40px;

  @media (max-width: 760px) {
    align-items: start;
    flex-direction: column;
  }
`;

const CharacterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;

  @media (max-width: 1020px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const CharacterCard = styled.article`
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 28px;
  background:
    radial-gradient(circle at 50% 20%, rgba(255, 122, 26, 0.14), transparent 42%),
    ${colors.surface};
  padding: 18px;
  transition: transform 0.24s ease, border-color 0.24s ease, box-shadow 0.24s ease;

  &:hover {
    border-color: rgba(214, 168, 79, 0.46);
    box-shadow: 0 28px 64px rgba(0, 0, 0, 0.46);
    transform: translateY(-6px);
  }
`;

const CharacterMedia = styled.div`
  position: relative;
  aspect-ratio: 1 / 1.05;
  overflow: hidden;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.04);

  img {
    object-fit: cover;
    transition: transform 0.55s ease;
  }

  ${CharacterCard}:hover & img {
    transform: scale(1.08);
  }
`;

const Badge = styled.span<{ $tone?: "teal" | "gold" }>`
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  border: 1px solid
    ${({ $tone }) => ($tone === "teal" ? "rgba(57, 214, 192, 0.34)" : "rgba(214, 168, 79, 0.36)")};
  border-radius: 999px;
  background: ${({ $tone }) => ($tone === "teal" ? "rgba(57, 214, 192, 0.08)" : "rgba(214, 168, 79, 0.08)")};
  padding: 0 10px;
  color: ${({ $tone }) => ($tone === "teal" ? colors.teal : colors.gold)};
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.08em;
  text-transform: uppercase;
`;

const CardMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
`;

const CollectionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
  }
`;

const CollectionCard = styled.article`
  position: relative;
  min-height: 420px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 28px;
  background: ${colors.elevated};
  padding: 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: transform 0.24s ease, border-color 0.24s ease;

  &:hover {
    border-color: rgba(255, 122, 26, 0.48);
    transform: translateY(-5px);
  }
`;

const CollectionPreview = styled.div`
  position: absolute;
  inset: 0;
  opacity: 0.48;

  img {
    object-fit: cover;
    transition: transform 0.65s ease;
  }

  ${CollectionCard}:hover & img {
    transform: scale(1.06);
  }

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(7, 7, 7, 0.18), rgba(7, 7, 7, 0.88));
  }
`;

const CollectionContent = styled.div`
  position: relative;
  z-index: 1;
`;

const Timeline = styled.div`
  position: relative;
  display: grid;
  gap: 18px;
  margin-top: 44px;
  padding-left: 28px;

  &::before {
    content: "";
    position: absolute;
    top: 8px;
    bottom: 8px;
    left: 6px;
    width: 2px;
    background: linear-gradient(${colors.orange}, ${colors.teal});
  }
`;

const Milestone = styled.article`
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.045);
  padding: 22px;

  &::before {
    content: "";
    position: absolute;
    top: 28px;
    left: -29px;
    width: 14px;
    height: 14px;
    border: 2px solid ${colors.nearBlack};
    border-radius: 50%;
    background: ${colors.gold};
    box-shadow: 0 0 24px rgba(214, 168, 79, 0.5);
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-top: 42px;

  @media (max-width: 920px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.article`
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 24px;
  background:
    radial-gradient(circle at 50% 0, rgba(214, 168, 79, 0.16), transparent 50%),
    ${colors.surface};
  padding: 28px 24px;
`;

const StatNumber = styled.strong`
  display: block;
  color: ${colors.white};
  font-size: clamp(38px, 5vw, 58px);
  font-weight: 950;
  line-height: 0.92;

  span {
    color: ${colors.orange};
  }
`;

const SplitGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 18px;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.article`
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.045);
  padding: clamp(24px, 4vw, 40px);
`;

const TestimonialGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-top: 40px;

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
  }
`;

const Avatar = styled.div`
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: 50%;
  background: linear-gradient(135deg, ${colors.orange}, ${colors.gold});
  color: ${colors.nearBlack};
  font-weight: 950;
`;

const FAQList = styled.div`
  display: grid;
  gap: 12px;
  margin-top: 40px;
`;

const FAQItem = styled.details`
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.045);
  padding: 0 22px;

  &[open] {
    border-color: rgba(214, 168, 79, 0.34);
  }

  summary {
    display: flex;
    min-height: 64px;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    color: ${colors.white};
    cursor: pointer;
    font-size: 17px;
    font-weight: 900;
    list-style: none;
  }

  summary::-webkit-details-marker {
    display: none;
  }

  summary::after {
    content: "+";
    color: ${colors.gold};
    font-size: 24px;
  }

  &[open] summary::after {
    content: "-";
  }

  p {
    margin: 0;
    padding: 0 0 22px;
    color: ${colors.softGray};
    line-height: 1.75;
  }

  summary:focus-visible {
    outline: 2px solid ${colors.teal};
    outline-offset: 4px;
  }
`;

const FinalCTA = styled(Section)`
  padding-top: 0;
`;

const CtaPanel = styled.div`
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(214, 168, 79, 0.24);
  border-radius: 32px;
  background:
    linear-gradient(90deg, rgba(7, 7, 7, 0.94), rgba(7, 7, 7, 0.64)),
    url("/images/homepage-slider/1781932893011-aa21fded-ChatGPT-Image-13_18_17-19-thg-6-2026.png") center / cover;
  padding: clamp(32px, 7vw, 80px);
`;

const TrustBadges = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 28px;
`;

const MotionStyles = styled.div`
  @keyframes riseIn {
    from {
      opacity: 0;
      transform: translateY(18px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes floatIn {
    from {
      opacity: 0;
      transform: translateY(28px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes drift {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      scroll-behavior: auto !important;
      transition-duration: 0.001ms !important;
    }
  }
`;

type Character = {
  name: string;
  image: string;
  description: string;
  count: string;
  status: string;
};

type Collection = {
  name: string;
  image: string;
  description: string;
  figures: string;
  status: string;
};

const characters: Character[] = [
  {
    name: "Ricon",
    image: "/images/products/1782711377495-cb06212e-Ricon---3.png",
    description: "Tinh quái, năng lượng cao và luôn là tâm điểm trong mỗi capsule.",
    count: "12 figures",
    status: "Active drop",
  },
  {
    name: "Vanie",
    image: "/images/products/1782711661889-5d431314-Vanie---3.png",
    description: "Một biểu tượng mềm mại, giàu cảm xúc cho collector thích storytelling.",
    count: "10 figures",
    status: "Limited",
  },
  {
    name: "Heni",
    image: "/images/products/1782712062079-4200bb9d-Heni---3.png",
    description: "Lạnh lùng, sắc nét, được thiết kế cho các set hiếm và chase.",
    count: "8 figures",
    status: "Coming wave",
  },
  {
    name: "Mino",
    image: "/images/products/1782713886922-c5c894c3-Mino---3.png",
    description: "Ấm áp, vui nhộn và dễ nhận diện trong mọi bộ sưu tập.",
    count: "9 figures",
    status: "Collector pick",
  },
];

const collections: Collection[] = [
  {
    name: "Ricon Neon Island",
    image: "/images/homepage-slider/1781932893011-aa21fded-ChatGPT-Image-13_18_17-19-thg-6-2026.png",
    description: "Capsule mở đầu với năng lượng điện ảnh, màu neon và các phiên bản keychain.",
    figures: "12 mẫu",
    status: "Rare chase",
  },
  {
    name: "Vanie Blind Box",
    image: "/images/blind-box/vanie-blind-box-cover.png",
    description: "Blind box dành cho người thích cảm giác bất ngờ, hoàn thiện set và mở thưởng.",
    figures: "10 mẫu",
    status: "Live",
  },
  {
    name: "Island Founders",
    image: "/images/Blindbox.png",
    description: "Dòng capsule nền tảng cho cộng đồng, nối sản phẩm vật lý với game reward.",
    figures: "6 mẫu",
    status: "Archive",
  },
];

const features = [
  {
    mark: "01",
    title: "Thiết kế có nhân vật",
    copy: "Mỗi figure có tính cách, màu sắc và vai trò riêng trong thế giới Đảo Khủng Long.",
  },
  {
    mark: "02",
    title: "Mở hộp có mục tiêu",
    copy: "Collector không chỉ mua sản phẩm, họ mở khóa set, mã thưởng và trạng thái sở hữu.",
  },
  {
    mark: "03",
    title: "Vật phẩm làm để giữ",
    copy: "Ưu tiên cảm giác cầm nắm, ảnh sản phẩm rõ và trải nghiệm lâu dài sau khi mua.",
  },
];

const milestones = [
  ["2024", "Phác thảo thế giới nhân vật đầu tiên và định hình DNA hình ảnh dark collectible."],
  ["2025", "Ra mắt hệ thống mã mở khóa, kết nối vật phẩm vật lý với trải nghiệm game."],
  ["2026", "Chuẩn bị brand launch mới với capsule, CMS featured products và cộng đồng collector."],
];

const stats = [
  ["30", "+", "Mẫu figure và keychain đã phát triển"],
  ["5K", "+", "Collector trong cộng đồng"],
  ["3", "", "Capsule collection đang vận hành"],
  ["100", "%", "Thiết kế gốc cho thị trường Việt Nam"],
];

const testimonials = [
  ["DP", "Danh Phạm", "Founder Collector", "Cảm giác mở blind box rất đã, nhưng thứ giữ mình lại là hệ thống set và mã mở khóa."],
  ["RC", "Ricon Hunter", "Early Collector", "Card nhân vật, ảnh sản phẩm và rarity làm bộ sưu tập có cảm giác premium hơn hẳn."],
  ["VN", "Vanie Club", "Community Member", "Đây không chỉ là shop bán móc khóa. Nó giống một thế giới nhỏ đang lớn lên từng drop."],
];

const faqs = [
  ["Đảo Khủng Long bán gì?", "Chúng tôi tập trung vào blind box, móc khóa collector, capsule nhân vật và vật phẩm có thể kết nối với mã mở khóa trong game."],
  ["Mỗi bộ sưu tập có giới hạn không?", "Một số capsule có trạng thái limited hoặc chase. Thông tin rarity và số lượng sẽ được hiển thị rõ trong từng đợt mở bán."],
  ["Mã mở khóa dùng để làm gì?", "Mã đi kèm sản phẩm giúp bạn mở khóa vật phẩm, slot sưu tập hoặc phần thưởng trong hệ sinh thái Đảo Khủng Long."],
  ["Tôi nên bắt đầu từ đâu?", "Bắt đầu với một blind box hoặc bộ nhân vật bạn thích nhất, sau đó theo dõi trang Bộ sưu tập để hoàn thiện set."],
];

export default function AboutPage() {
  return (
    <Page>
      <MotionStyles />
      <Hero aria-labelledby="about-hero-title">
        <HeroGrid>
          <HeroContent>
            <Eyebrow>Premium collectible universe</Eyebrow>
            <HeroTitle id="about-hero-title">
              Đảo Khủng Long
              <span>không chỉ là blind box</span>
            </HeroTitle>
            <HeroLead>
              Chúng tôi xây dựng một thế giới collectible điện ảnh, nơi mỗi nhân vật có câu chuyện,
              mỗi lần mở hộp có cảm xúc và mỗi mã mở khóa đưa collector tiến sâu hơn vào hòn đảo.
            </HeroLead>
            <ButtonRow>
              <Button href="/bo-suu-tap" $variant="primary">Khám phá bộ sưu tập</Button>
              <Button href="/account/collection" $variant="secondary">Bộ sưu tập của tôi</Button>
            </ButtonRow>
          </HeroContent>
          <HeroVisual aria-label="Hộp blind box và nhân vật collectible Đảo Khủng Long">
            <ProductOrb>
              <HeroImageWrap>
                <Image src="/images/Blindbox.png" alt="Blind box Đảo Khủng Long" fill priority sizes="(max-width: 900px) 86vw, 420px" />
              </HeroImageWrap>
            </ProductOrb>
            <FloatingTag $top="0" $left="0">
              <strong>01</strong>
              <span>Limited drops</span>
            </FloatingTag>
            <FloatingTag $top="58%" $right="0" $delay="0.8s">
              <strong>Rare</strong>
              <span>Chase energy</span>
            </FloatingTag>
          </HeroVisual>
        </HeroGrid>
        <ScrollHint href="#mission">Cuộn xuống</ScrollHint>
      </Hero>

      <Section id="mission">
        <Container>
          <MissionGrid>
            <div>
              <Eyebrow>Mission</Eyebrow>
              <SectionTitle>Biến sưu tập thành một <span>nghi thức mở khóa</span></SectionTitle>
            </div>
            <div>
              <Manifesto>
                Chúng tôi thiết kế cảm giác háo hức trước khi mở hộp, niềm vui khi thấy nhân vật và lý do để quay lại hoàn thiện set.
              </Manifesto>
              <SectionCopy>
                About page cũ kể câu chuyện như một đoạn mô tả tĩnh: ít hình ảnh, nhịp đọc phẳng, CTA yếu và chưa tạo cảm giác thương hiệu cao cấp. Bản mới chuyển nội dung thành hành trình: hero tạo cảm xúc, story tạo niềm tin, character và collection tạo ham muốn, CTA dẫn người dùng đi tiếp.
              </SectionCopy>
            </div>
          </MissionGrid>
          <FeatureGrid>
            {features.map((feature) => (
              <FeatureCard key={feature.title}>
                <IconMark>{feature.mark}</IconMark>
                <CardTitle>{feature.title}</CardTitle>
                <CardCopy>{feature.copy}</CardCopy>
              </FeatureCard>
            ))}
          </FeatureGrid>
        </Container>
      </Section>

      <Section>
        <Container>
          <StoryPanel>
            <StoryRow>
              <CinematicImage>
                <Image src="/images/homepage-slider/1781853741292-a6b4c2af-backgroundshop.png" alt="Không gian cinematic của Đảo Khủng Long" fill sizes="(max-width: 860px) 100vw, 48vw" />
              </CinematicImage>
              <StoryText>
                <Eyebrow>Brand story</Eyebrow>
                <h3>Từ một chiếc hộp nhỏ đến cả một thế giới</h3>
                <p>
                  Đảo Khủng Long bắt đầu từ niềm vui rất đơn giản: mở một chiếc hộp và gặp một nhân vật mới. Nhưng chúng tôi muốn cảm giác đó không kết thúc sau vài giây. Mỗi figure được đặt trong một hệ sinh thái có set, rarity, mã mở khóa và hành trình sở hữu.
                </p>
                <PullQuote>“Một sản phẩm tốt khiến bạn muốn giữ lại. Một thế giới tốt khiến bạn muốn quay lại.”</PullQuote>
              </StoryText>
            </StoryRow>
            <StoryRow $reverse>
              <StoryText>
                <Eyebrow>Design language</Eyebrow>
                <h3>Tối, sáng, hiếm và có nhịp điện ảnh</h3>
                <p>
                  Chúng tôi chọn dark luxury không phải để trông ngầu hơn, mà để sản phẩm nổi bật như vật thể trưng bày. Ánh vàng dùng cho rarity và cảm xúc mở hộp. Teal dùng như tín hiệu công nghệ cho mã mở khóa, game reward và trạng thái collector.
                </p>
              </StoryText>
              <CinematicImage>
                <Image src="/images/homepage-slider/1781932893011-aa21fded-ChatGPT-Image-13_18_17-19-thg-6-2026.png" alt="Nhân vật Ricon trong bối cảnh ánh sáng cinematic" fill sizes="(max-width: 860px) 100vw, 48vw" />
              </CinematicImage>
            </StoryRow>
          </StoryPanel>
        </Container>
      </Section>

      <Section>
        <Container>
          <HeaderRow>
            <div>
              <Eyebrow>Our characters</Eyebrow>
              <SectionTitle>Nhân vật như những <span>collectible hero</span></SectionTitle>
            </div>
            <Button href="/bo-suu-tap?nhanvat=all" $variant="secondary">Xem nhân vật</Button>
          </HeaderRow>
          <CharacterGrid>
            {characters.map((character) => (
              <CharacterCard key={character.name}>
                <CharacterMedia>
                  <Image src={character.image} alt={`Nhân vật ${character.name}`} fill sizes="(max-width: 560px) 90vw, (max-width: 1020px) 44vw, 260px" />
                </CharacterMedia>
                <CardTitle>{character.name}</CardTitle>
                <CardCopy>{character.description}</CardCopy>
                <CardMeta>
                  <Badge>{character.count}</Badge>
                  <Badge $tone="teal">{character.status}</Badge>
                </CardMeta>
              </CharacterCard>
            ))}
          </CharacterGrid>
        </Container>
      </Section>

      <Section>
        <Container>
          <HeaderRow>
            <div>
              <Eyebrow>Our collections</Eyebrow>
              <SectionTitle>Capsule drops được thiết kế như <span>product launch</span></SectionTitle>
            </div>
          </HeaderRow>
          <CollectionGrid>
            {collections.map((collection) => (
              <CollectionCard key={collection.name}>
                <CollectionPreview>
                  <Image src={collection.image} alt={collection.name} fill sizes="(max-width: 920px) 92vw, 360px" />
                </CollectionPreview>
                <CollectionContent>
                  <Badge>{collection.status}</Badge>
                </CollectionContent>
                <CollectionContent>
                  <CardTitle>{collection.name}</CardTitle>
                  <CardCopy>{collection.description}</CardCopy>
                  <CardMeta>
                    <Badge $tone="teal">{collection.figures}</Badge>
                    <Button href="/bo-suu-tap" $variant="secondary">Khám phá</Button>
                  </CardMeta>
                </CollectionContent>
              </CollectionCard>
            ))}
          </CollectionGrid>
        </Container>
      </Section>

      <Section>
        <Container>
          <SplitGrid>
            <Panel>
              <Eyebrow>Why choose us</Eyebrow>
              <SectionTitle>Không bán món đồ rời rạc. Chúng tôi bán <span>hành trình sưu tập</span></SectionTitle>
              <SectionCopy>
                Sản phẩm, mã mở khóa, trang collection và reward được nối với nhau để collector có cảm giác tiến bộ thật. Mỗi lần mua là một bước trong bộ sưu tập, không phải một giao dịch đơn lẻ.
              </SectionCopy>
            </Panel>
            <Panel>
              <Eyebrow>Achievements</Eyebrow>
              <CardTitle>Những gì đã sẵn sàng cho brand launch</CardTitle>
              <CardCopy>CMS featured products, blind box pool, redemption codes, account collection, admin dashboard và các capsule nhân vật đầu tiên.</CardCopy>
              <TrustBadges>
                <Badge>CMS ready</Badge>
                <Badge $tone="teal">Game rewards</Badge>
                <Badge>Collector sets</Badge>
              </TrustBadges>
            </Panel>
          </SplitGrid>
        </Container>
      </Section>

      <Section>
        <Container>
          <Eyebrow>Timeline</Eyebrow>
          <SectionTitle>Từng phase đưa hòn đảo đến gần collector hơn</SectionTitle>
          <Timeline>
            {milestones.map(([year, copy]) => (
              <Milestone key={year}>
                <Badge>{year}</Badge>
                <CardTitle>{copy}</CardTitle>
              </Milestone>
            ))}
          </Timeline>
        </Container>
      </Section>

      <Section>
        <Container>
          <Eyebrow>Statistics</Eyebrow>
          <SectionTitle>Những con số cho thấy nền móng đã hình thành</SectionTitle>
          <StatsGrid>
            {stats.map(([number, suffix, label]) => (
              <StatCard key={label}>
                <StatNumber>{number}<span>{suffix}</span></StatNumber>
                <CardCopy>{label}</CardCopy>
              </StatCard>
            ))}
          </StatsGrid>
        </Container>
      </Section>

      <Section>
        <Container>
          <SplitGrid>
            <Panel>
              <Eyebrow>Community</Eyebrow>
              <SectionTitle>Cộng đồng là nơi rarity trở thành câu chuyện</SectionTitle>
              <SectionCopy>
                Chúng tôi thiết kế để người chơi khoe set, đổi kinh nghiệm mở hộp, theo dõi drop mới và cùng nhau săn chase. Community không phải phần phụ, nó là nhịp tim của brand.
              </SectionCopy>
            </Panel>
            <Panel>
              <Eyebrow>Behind the brand</Eyebrow>
              <SectionTitle>Một studio nhỏ, ám ảnh bởi chi tiết</SectionTitle>
              <SectionCopy>
                Từ ảnh sản phẩm, microcopy, trạng thái collection đến admin CMS, mọi thứ được build để đội vận hành có thể ra drop mới nhanh hơn mà vẫn giữ cảm giác premium.
              </SectionCopy>
            </Panel>
          </SplitGrid>
        </Container>
      </Section>

      <Section>
        <Container>
          <Eyebrow>Testimonials</Eyebrow>
          <SectionTitle>Collector nói gì về trải nghiệm mở hộp</SectionTitle>
          <TestimonialGrid>
            {testimonials.map(([initials, name, role, quote]) => (
              <FeatureCard key={name}>
                <Avatar>{initials}</Avatar>
                <CardTitle>{name}</CardTitle>
                <Badge $tone="teal">{role}</Badge>
                <CardCopy>★★★★★</CardCopy>
                <CardCopy>{quote}</CardCopy>
              </FeatureCard>
            ))}
          </TestimonialGrid>
        </Container>
      </Section>

      <Section>
        <Container>
          <Eyebrow>FAQ</Eyebrow>
          <SectionTitle>Câu hỏi thường gặp trước khi bắt đầu sưu tập</SectionTitle>
          <FAQList>
            {faqs.map(([question, answer]) => (
              <FAQItem key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </FAQItem>
            ))}
          </FAQList>
        </Container>
      </Section>

      <FinalCTA>
        <Container>
          <CtaPanel>
            <Eyebrow>Start collecting</Eyebrow>
            <SectionTitle>Chọn hộp đầu tiên. Mở khóa nhân vật đầu tiên. Bắt đầu câu chuyện của bạn.</SectionTitle>
            <SectionCopy>
              Khám phá capsule đang mở bán, hoàn thiện set yêu thích và trở thành một phần của cộng đồng collector Đảo Khủng Long.
            </SectionCopy>
            <ButtonRow>
              <Button href="/bo-suu-tap" $variant="primary">Mua blind box</Button>
              <Button href="/account/collection" $variant="secondary">Xem collection</Button>
            </ButtonRow>
            <TrustBadges>
              <Badge>Giao hàng toàn quốc</Badge>
              <Badge $tone="teal">Mã mở khóa riêng</Badge>
              <Badge>Đổi trả trong 7 ngày</Badge>
            </TrustBadges>
          </CtaPanel>
        </Container>
      </FinalCTA>
    </Page>
  );
}
