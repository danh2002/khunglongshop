"use client";

import { SectionHeading } from "./design-system";

const Heading = ({ title }: { title: string }) => {
  const words = title.split(" ");
  const last = words.pop();

  return (
    <SectionHeading>
      {words.join(" ")} {last ? <span>{last}</span> : null}
    </SectionHeading>
  );
};

export default Heading;
