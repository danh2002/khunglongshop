"use client";

import React, { useState } from "react";
import styled from "styled-components";
import { sanitize, sanitizeHtml } from "@/lib/sanitize";
import { formatCategoryName } from "@/utils/categoryFormating";

const TabsShell = styled.section`
  margin: 24px auto 72px;
  padding: 0 20px;
  color: #f7f1e8;
`;

const Panel = styled.div`
  border-top: 1px solid rgba(242, 95, 0, 0.45);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background:
    linear-gradient(180deg, rgba(242, 95, 0, 0.08), rgba(242, 95, 0, 0)),
    rgba(8, 8, 8, 0.74);
`;

const TabList = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const TabButton = styled.button<{ $active: boolean }>`
  min-height: 58px;
  border: 0;
  border-bottom: 2px solid ${({ $active }) => ($active ? "#f25f00" : "transparent")};
  background: ${({ $active }) => ($active ? "rgba(242, 95, 0, 0.14)" : "transparent")};
  color: ${({ $active }) => ($active ? "#ffffff" : "rgba(247, 241, 232, 0.62)")};
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 900;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  transition:
    background 180ms ease,
    color 180ms ease,
    border-color 180ms ease;

  &:hover {
    background: rgba(242, 95, 0, 0.1);
    color: #ffffff;
  }

  &:focus-visible {
    outline: 2px solid #f25f00;
    outline-offset: -4px;
  }
`;

const Content = styled.div`
  min-height: 180px;
  padding: clamp(24px, 4vw, 44px);
`;

const Description = styled.div`
  max-width: 920px;
  color: rgba(247, 241, 232, 0.78);
  font-size: clamp(1rem, 1.6vw, 1.12rem);
  line-height: 1.8;

  p,
  ul,
  ol {
    margin: 0 0 16px;
  }

  strong,
  b {
    color: #ffffff;
  }
`;

const InfoGrid = styled.dl`
  display: grid;
  grid-template-columns: minmax(180px, 0.42fr) minmax(0, 1fr);
  margin: 0;
  border: 1px solid rgba(255, 255, 255, 0.12);

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const InfoLabel = styled.dt`
  padding: 18px 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.035);
  color: rgba(247, 241, 232, 0.52);
  font-size: 0.76rem;
  font-weight: 900;
  letter-spacing: 0.16em;
  text-transform: uppercase;

  &:last-of-type {
    border-bottom: 0;
  }

  @media (max-width: 640px) {
    border-bottom: 0;
    padding-bottom: 6px;
  }
`;

const InfoValue = styled.dd`
  margin: 0;
  padding: 18px 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  color: #ffffff;
  font-size: clamp(1rem, 1.5vw, 1.14rem);
  font-weight: 700;

  &:last-of-type {
    border-bottom: 0;
  }

  @media (max-width: 640px) {
    padding-top: 6px;
  }
`;

const ProductTabs = ({ product }: { product: Product }) => {
  const [currentProductTab, setCurrentProductTab] = useState(0);
  const categoryName = product?.category?.name
    ? sanitize(formatCategoryName(product.category.name))
    : "Chưa phân loại";

  return (
    <TabsShell>
      <Panel>
        <TabList role="tablist" aria-label="Thông tin sản phẩm">
          <TabButton
            type="button"
            role="tab"
            id="product-description-tab"
            aria-controls="product-description-panel"
            aria-selected={currentProductTab === 0}
            $active={currentProductTab === 0}
            onClick={() => setCurrentProductTab(0)}
          >
            Mô tả
          </TabButton>
          <TabButton
            type="button"
            role="tab"
            id="product-info-tab"
            aria-controls="product-info-panel"
            aria-selected={currentProductTab === 1}
            $active={currentProductTab === 1}
            onClick={() => setCurrentProductTab(1)}
          >
            Thông tin thêm
          </TabButton>
        </TabList>

        <Content>
          {currentProductTab === 0 ? (
            <Description
              id="product-description-panel"
              role="tabpanel"
              aria-labelledby="product-description-tab"
              dangerouslySetInnerHTML={{
                __html: sanitizeHtml(product?.description),
              }}
            />
          ) : (
            <InfoGrid id="product-info-panel" role="tabpanel" aria-labelledby="product-info-tab">
              <InfoLabel>Nhà sản xuất</InfoLabel>
              <InfoValue>{sanitize(product?.manufacturer || "Khủng Long Shop")}</InfoValue>

              <InfoLabel>Danh mục</InfoLabel>
              <InfoValue>{categoryName}</InfoValue>

              <InfoLabel>Tình trạng</InfoLabel>
              <InfoValue>{product?.inStock > 0 ? "Còn hàng" : "Hết hàng"}</InfoValue>
            </InfoGrid>
          )}
        </Content>
      </Panel>
    </TabsShell>
  );
};

export default ProductTabs;
