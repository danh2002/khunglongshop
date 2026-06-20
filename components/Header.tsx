"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  FaBagShopping,
  FaBars,
  FaChevronDown,
  FaHeart,
  FaMagnifyingGlass,
  FaRegUser,
  FaXmark,
} from "react-icons/fa6";
import styled from "styled-components";
import { useProductStore } from "@/app/_zustand/store";
import { useWishlistStore } from "@/app/_zustand/wishlistStore";
import type {
  NavigationCategory,
  NavigationCollectorSet,
} from "@/lib/navigation";
import NotificationBell from "./NotificationBell";

const HeaderShell = styled.header`
  position: sticky;
  top: 0;
  z-index: 1000;
  height: 64px;
  border-bottom: 1px solid #1a1a1a;
  background: rgba(10, 10, 10, 0.94);
  backdrop-filter: blur(12px);
`;

const Nav = styled.div`
  display: flex;
  width: min(100%, 1440px);
  height: 64px;
  align-items: center;
  gap: 32px;
  margin: 0 auto;
  padding: 0 48px;

  @media (max-width: 1180px) {
    padding: 0 24px;
  }
`;

const Logo = styled(Link)`
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 1px;
  text-decoration: none;
  text-transform: uppercase;
`;

const LogoImage = styled.span`
  position: relative;
  width: 38px;
  height: 38px;
`;

const Links = styled.nav`
  display: flex;
  align-items: center;
  gap: clamp(20px, 3vw, 40px);
  margin-left: auto;

  @media (max-width: 1020px) {
    display: none;
  }
`;

const DropdownWrap = styled.div`
  position: relative;
  height: 64px;
  display: flex;
  align-items: center;
`;

const Trigger = styled.button<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 64px;
  border: 0;
  border-bottom: 2px solid ${({ $open }) => ($open ? "#e85d00" : "transparent")};
  background: transparent;
  color: ${({ $open }) => ($open ? "#e85d00" : "#cccccc")};
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;

  svg {
    width: 10px;
    transition: transform 0.2s ease;
    transform: rotate(${({ $open }) => ($open ? "180deg" : "0deg")});
  }

  &:hover {
    color: #e85d00;
  }
`;

const NavLink = styled(Link)<{ $active: boolean }>`
  height: 64px;
  display: inline-flex;
  align-items: center;
  border-bottom: 2px solid ${({ $active }) => ($active ? "#e85d00" : "transparent")};
  color: ${({ $active }) => ($active ? "#e85d00" : "#cccccc")};
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-decoration: none;
  text-transform: uppercase;

  &:hover {
    color: #e85d00;
  }
`;

const DropdownPanel = styled.div<{ $open: boolean }>`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 200;
  min-width: 220px;
  padding: 8px;
  border: 1px solid #1e1e1e;
  border-radius: 12px;
  background: #111111;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  visibility: ${({ $open }) => ($open ? "visible" : "hidden")};
  transform: translateY(${({ $open }) => ($open ? "0" : "-6px")});
  transition: 0.2s ease;
`;

const DropdownLink = styled(Link)<{ $divider?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: ${({ $divider }) => ($divider ? "4px" : "0")};
  border-top: ${({ $divider }) => ($divider ? "1px solid #1e1e1e" : "0")};
  border-radius: 8px;
  padding: ${({ $divider }) => ($divider ? "12px 16px 10px" : "10px 16px")};
  color: #cccccc;
  font-size: 14px;
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    background: rgba(232, 93, 0, 0.1);
    color: #e85d00;
  }
`;

const ItemThumb = styled.span`
  position: relative;
  display: grid;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  place-items: center;
  overflow: hidden;
  border-radius: 50%;
  background: #1a1a1a;
  color: #e85d00;
  font-size: 14px;
`;

const Actions = styled.div`
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 20px;
`;

const ActionLink = styled(Link)`
  position: relative;
  display: grid;
  width: 24px;
  height: 40px;
  place-items: center;
  color: #cccccc;
  text-decoration: none;

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    color: #e85d00;
  }
`;

const ActionButton = styled.button`
  position: relative;
  display: grid;
  width: 24px;
  height: 40px;
  place-items: center;
  border: 0;
  background: transparent;
  color: #cccccc;
  cursor: pointer;

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    color: #e85d00;
  }

  &:focus-visible {
    outline: 2px solid #e85d00;
    outline-offset: 4px;
  }
`;

const SearchWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const SearchForm = styled.form<{ $open: boolean }>`
  position: absolute;
  top: 50%;
  right: 0;
  z-index: 20;
  display: ${({ $open }) => ($open ? "flex" : "none")};
  width: min(320px, calc(100vw - 48px));
  height: 42px;
  align-items: center;
  overflow: hidden;
  border: 1px solid rgba(232, 93, 0, 0.55);
  border-radius: 6px;
  background: #0a0a0a;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.5);
  transform: translateY(-50%);
`;

const SearchField = styled.input`
  min-width: 0;
  flex: 1;
  height: 100%;
  border: 0;
  background: transparent;
  padding: 0 12px;
  color: #ffffff;
  font-family: var(--font-body), sans-serif;
  font-size: 14px;
  outline: none;

  &::placeholder {
    color: rgba(255, 255, 255, 0.45);
  }
`;

const SearchSubmit = styled.button`
  display: grid;
  width: 44px;
  height: 100%;
  flex: 0 0 44px;
  place-items: center;
  border: 0;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  background: transparent;
  color: #cccccc;
  cursor: pointer;

  &:hover,
  &:focus-visible {
    color: #e85d00;
  }
`;

const Badge = styled.span`
  position: absolute;
  top: 2px;
  right: -8px;
  display: grid;
  min-width: 17px;
  height: 17px;
  place-items: center;
  border-radius: 9px;
  background: #e85d00;
  padding: 0 4px;
  color: #ffffff;
  font-size: 9px;
  font-weight: 800;
`;

const MenuButton = styled.button`
  display: none;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 0;
  background: transparent;
  color: #cccccc;
  cursor: pointer;

  @media (max-width: 1020px) {
    display: grid;
  }
`;

const MobilePanel = styled.div<{ $open: boolean }>`
  position: fixed;
  top: 64px;
  right: 0;
  left: 0;
  display: ${({ $open }) => ($open ? "grid" : "none")};
  max-height: calc(100vh - 64px);
  overflow-y: auto;
  border-bottom: 1px solid #1e1e1e;
  background: #0a0a0a;
  padding: 12px 24px 24px;
`;

const MobileTrigger = styled.button<{ $open: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 0;
  border: 0;
  border-bottom: 1px solid #1a1a1a;
  background: transparent;
  color: ${({ $open }) => ($open ? "#e85d00" : "#cccccc")};
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;

  svg {
    transform: rotate(${({ $open }) => ($open ? "180deg" : "0")});
  }
`;

const MobileDropdown = styled.div<{ $open: boolean }>`
  display: ${({ $open }) => ($open ? "grid" : "none")};
  padding: 6px 0 10px 14px;

  a {
    padding: 10px 0;
    color: #999999;
    font-size: 13px;
    text-decoration: none;
  }
`;

const MobileLink = styled(Link)`
  padding: 15px 0;
  border-bottom: 1px solid #1a1a1a;
  color: #cccccc;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1px;
  text-decoration: none;
  text-transform: uppercase;
`;

const MobileSearchForm = styled.form`
  display: flex;
  height: 42px;
  margin: 6px 0 10px;
  overflow: hidden;
  border: 1px solid rgba(232, 93, 0, 0.45);
  border-radius: 6px;
  background: #111111;
`;

const AdminActions = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  margin-left: auto;
`;

type OpenMenu = "categories" | "characters" | null;

function CategoryThumb({ icon }: { icon: string | null }) {
  if (!icon) return null;
  const isImage = icon.startsWith("/") || icon.startsWith("http");
  return (
    <ItemThumb aria-hidden="true">
      {isImage ? <Image src={icon} alt="" fill sizes="24px" style={{ objectFit: "cover" }} /> : icon}
    </ItemThumb>
  );
}

export default function Header({
  categories,
  collectorSets,
}: {
  categories: NavigationCategory[];
  collectorSets: NavigationCollectorSet[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { status } = useSession();
  const cartQuantity = useProductStore((state) => state.allQuantity);
  const wishQuantity = useWishlistStore((state) => state.wishQuantity);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const [mobileMenu, setMobileMenu] = useState<OpenMenu>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const navRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = pathname.startsWith("/admin");

  const dynamicSets = collectorSets.filter((set) => set.slug !== "vanie");

  useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
    setMobileMenu(null);
    setSearchOpen(false);
    setSearchTerm("");
  }, [pathname]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!navRef.current?.contains(target)) setOpenMenu(null);
      if (searchOpen && !searchRef.current?.contains(target)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, [searchOpen]);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchTerm.trim();
    if (!query) return;

    const params = new URLSearchParams({ q: query });
    setSearchOpen(false);
    setMobileOpen(false);
    router.push(`/search?${params.toString()}`);
  };

  const closeSearchWithEscape = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    setSearchOpen(false);
    searchButtonRef.current?.focus();
  };

  const renderCategoryLinks = () => (
    <>
      <DropdownLink href="/bo-suu-tap?category=hop-mu">
        Hộp mù
      </DropdownLink>
      <DropdownLink href="/bo-suu-tap" $divider>
        Tất cả
      </DropdownLink>
    </>
  );

  const renderCharacterLinks = () => (
    <>
      <DropdownLink href="/bo-suu-tap?nhanvat=vanie">
        Vanie
      </DropdownLink>
      {dynamicSets.map((set) => (
        <DropdownLink href={`/bo-suu-tap?nhanvat=${set.slug}`} key={set.id}>
          {set.image ? (
            <ItemThumb>
              <Image src={set.image} alt="" fill sizes="24px" style={{ objectFit: "cover" }} />
            </ItemThumb>
          ) : null}
          {set.name}
        </DropdownLink>
      ))}
      <DropdownLink href="/bo-suu-tap?nhanvat=all" $divider>
        Tất cả
      </DropdownLink>
    </>
  );

  return (
    <HeaderShell ref={navRef}>
      <Nav>
        <Logo href="/" aria-label="Khủng Long Shop">
          <LogoImage>
            <Image src="/images/logo.png" alt="" fill sizes="38px" style={{ objectFit: "contain" }} priority />
          </LogoImage>
          <span>Khủng Long Shop</span>
        </Logo>

        {isAdmin ? (
          <AdminActions>
            <NotificationBell />
            <ActionLink href="/account" aria-label="Tài khoản"><FaRegUser /></ActionLink>
          </AdminActions>
        ) : (
          <>
            <Links aria-label="Điều hướng chính">
              <DropdownWrap
                onMouseEnter={() => setOpenMenu("categories")}
                onMouseLeave={() => setOpenMenu(null)}
              >
                <Trigger
                  type="button"
                  $open={openMenu === "categories"}
                  onClick={() => setOpenMenu((current) => current === "categories" ? null : "categories")}
                  aria-expanded={openMenu === "categories"}
                >
                  DANH MỤC <FaChevronDown />
                </Trigger>
                <DropdownPanel $open={openMenu === "categories"}>
                  {renderCategoryLinks()}
                </DropdownPanel>
              </DropdownWrap>

              <DropdownWrap
                onMouseEnter={() => setOpenMenu("characters")}
                onMouseLeave={() => setOpenMenu(null)}
              >
                <Trigger
                  type="button"
                  $open={openMenu === "characters"}
                  onClick={() => setOpenMenu((current) => current === "characters" ? null : "characters")}
                  aria-expanded={openMenu === "characters"}
                >
                  NHÂN VẬT <FaChevronDown />
                </Trigger>
                <DropdownPanel $open={openMenu === "characters"}>
                  {renderCharacterLinks()}
                </DropdownPanel>
              </DropdownWrap>

              <NavLink href="/account/collection" $active={pathname.startsWith("/account/collection")}>BỘ SƯU TẬP</NavLink>
              <NavLink href="/about" $active={pathname.startsWith("/about")}>GIỚI THIỆU</NavLink>
            </Links>

            <Actions>
              <SearchWrap ref={searchRef}>
                <ActionButton
                  type="button"
                  aria-label="Tìm kiếm"
                  aria-expanded={searchOpen}
                  onClick={() => {
                    setOpenMenu(null);
                    setSearchOpen((open) => !open);
                  }}
                  ref={searchButtonRef}
                >
                  <FaMagnifyingGlass />
                </ActionButton>
                <SearchForm $open={searchOpen} onSubmit={submitSearch} onKeyDown={closeSearchWithEscape}>
                  <SearchField
                    ref={searchInputRef}
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Tìm merch..."
                    aria-label="Tìm merch"
                  />
                  <SearchSubmit type="submit" aria-label="Tìm kiếm">
                    <FaMagnifyingGlass />
                  </SearchSubmit>
                </SearchForm>
              </SearchWrap>
              <ActionLink href={status === "authenticated" ? "/account" : "/login"} aria-label="Tài khoản"><FaRegUser /></ActionLink>
              <ActionLink href="/wishlist" aria-label="Yêu thích">
                <FaHeart />
                {wishQuantity > 0 ? <Badge>{wishQuantity}</Badge> : null}
              </ActionLink>
              <ActionLink href="/cart" aria-label="Giỏ hàng">
                <FaBagShopping />
                {cartQuantity > 0 ? <Badge>{cartQuantity}</Badge> : null}
              </ActionLink>
              <MenuButton type="button" aria-label="Mở menu" onClick={() => setMobileOpen((open) => !open)}>
                {mobileOpen ? <FaXmark /> : <FaBars />}
              </MenuButton>
            </Actions>

            <MobilePanel $open={mobileOpen}>
              <MobileSearchForm onSubmit={submitSearch} onKeyDown={closeSearchWithEscape}>
                <SearchField
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Tìm merch..."
                  aria-label="Tìm merch"
                />
                <SearchSubmit type="submit" aria-label="Tìm kiếm">
                  <FaMagnifyingGlass />
                </SearchSubmit>
              </MobileSearchForm>
              <MobileTrigger type="button" $open={mobileMenu === "categories"} onClick={() => setMobileMenu((value) => value === "categories" ? null : "categories")}>
                DANH MỤC <FaChevronDown />
              </MobileTrigger>
              <MobileDropdown $open={mobileMenu === "categories"}>{renderCategoryLinks()}</MobileDropdown>
              <MobileTrigger type="button" $open={mobileMenu === "characters"} onClick={() => setMobileMenu((value) => value === "characters" ? null : "characters")}>
                NHÂN VẬT <FaChevronDown />
              </MobileTrigger>
              <MobileDropdown $open={mobileMenu === "characters"}>{renderCharacterLinks()}</MobileDropdown>
              <MobileLink href="/account/collection">BỘ SƯU TẬP</MobileLink>
              <MobileLink href="/about">GIỚI THIỆU</MobileLink>
            </MobilePanel>
          </>
        )}
      </Nav>
    </HeaderShell>
  );
}
