"use client";

import styled from "styled-components";
import { Eyebrow, SectionHeading, SectionShell } from "./design-system";

const TitleShell = styled(SectionShell)`
  min-height: 260px;
  display: grid;
  place-items: center;
`;

const Inner = styled.div`
  width: min(100%, 1180px);
  margin: 0 auto;
  padding: clamp(3rem, 6vw, 4.5rem) clamp(1rem, 3vw, 2rem);
  display: grid;
  justify-items: center;
  gap: 1rem;
  text-align: center;
`;

const Path = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.56);
  font-size: 0.9rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
`;

const SectionTitle = ({ title, path }: { title: string; path: string }) => {
  return (
    <TitleShell>
      <Inner>
        <Eyebrow>{path}</Eyebrow>
        <SectionHeading>
          {title.split(" ").slice(0, -1).join(" ")}{" "}
          <span>{title.split(" ").slice(-1)}</span>
        </SectionHeading>
        <Path>{path}</Path>
      </Inner>
    </TitleShell>
  );
};

export default SectionTitle;
