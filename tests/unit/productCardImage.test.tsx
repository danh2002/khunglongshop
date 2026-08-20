/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { createElement, type ImgHTMLAttributes } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", async () => {
  const React = await import("react");

  return {
    default: ({
      fill: _fill,
      fetchPriority: _fetchPriority,
      ...props
    }: ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean; fetchPriority?: string }) =>
      React.createElement("img", props),
  };
});

import ProductCardImage from "@/components/ProductCardImage";

describe("ProductCardImage", () => {
  it("uses the local fallback once when the product image fails", () => {
    render(
      createElement(ProductCardImage, {
        src: "https://example.com/images/product.webp",
        alt: "Sản phẩm thử nghiệm",
        sizes: "50vw",
      })
    );

    const image = screen.getByAltText("Sản phẩm thử nghiệm");
    expect(image.getAttribute("src")).toBe("https://example.com/images/product.webp");

    fireEvent.error(image);

    expect(image.getAttribute("src")).toBe("/images/logo.png");
    expect(image.getAttribute("alt")).toBe("Sản phẩm thử nghiệm");

    fireEvent.error(image);

    expect(image.getAttribute("src")).toBe("/images/logo.png");
  });
});
