"use client";

import styled from "styled-components";
import { BodyText, Eyebrow, PrimaryLink, SectionHeading, SectionShell, Wrapper } from "./design-system";

const IntroWrap = styled(Wrapper)`
  display: grid;
  justify-items: center;
  gap: 1.1rem;
  text-align: center;
`;

const IntroducingSection = () => {
  return (
    <SectionShell>
      <IntroWrap>
        <Eyebrow>Island signal</Eyebrow>
        <SectionHeading>
          INTRODUCING <span>ĐẢO KHỦNG LONG</span>
        </SectionHeading>
        <BodyText>
          Buy the latest electronics and collector merch for tech lovers.
        </BodyText>
        <PrimaryLink href="/shop">SHOP NOW</PrimaryLink>
      </IntroWrap>
    </SectionShell>
  );
};

export default IntroducingSection;
