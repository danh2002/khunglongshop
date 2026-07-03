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

const HeaderShell = styled.header<{ $isAdmin: boolean }>`
  position: sticky;
  top: 0;
  z-index: 1000;
  height: 64px;
  border-bottom: 1px solid ${({ $isAdmin }) => ($isAdmin ? "#1a1a1a" : "rgba(242, 238, 231, 0.1)")};
  background: ${({ $isAdmin }) =>
    $isAdmin
      ? "rgba(10, 10, 10, 0.94)"
      : "linear-gradient(180deg, rgba(17, 16, 14, 0.96), rgba(7, 7, 7, 0.9))"};
  box-shadow: ${({ $isAdmin }) =>
    $isAdmin ? "none" : "0 16px 40px rgba(0, 0, 0, 0.34)"};
  backdrop-filter: blur(14px);
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

  @media (max-width: 520px) {
    gap: 12px;
    padding: 0 12px;
  }
`;

const Logo = styled(Link)`
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
  color: #f2eee7;
  font-family: var(--font-display), var(--font-body), sans-serif;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: 0.8px;
  text-decoration: none;
  text-transform: uppercase;

  &:hover {
    color: #ffb23f;
  }

  @media (max-width: 520px) {
    gap: 0;

    span {
      display: none;
    }
  }
`;

const LogoImage = styled.span`
  position: relative;
  width: 38px;
  height: 38px;
  filter: drop-shadow(0 0 18px rgba(232, 93, 0, 0.34));
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
  color: ${({ $open }) => ($open ? "#ffb23f" : "rgba(242, 238, 231, 0.76)")};
  cursor: pointer;
  font-family: var(--font-display), var(--font-body), sans-serif;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 1px;
  text-transform: uppercase;

  svg {
    width: 10px;
    transition: transform 0.2s ease;
    transform: rotate(${({ $open }) => ($open ? "180deg" : "0deg")});
  }

  &:hover {
    color: #ffb23f;
  }

  &:focus-visible {
    outline: 2px solid #17d6c5;
    outline-offset: -8px;
  }
`;

const NavLink = styled(Link)<{ $active: boolean }>`
  height: 64px;
  display: inline-flex;
  align-items: center;
  border-bottom: 2px solid ${({ $active }) => ($active ? "#e85d00" : "transparent")};
  color: ${({ $active }) => ($active ? "#ffb23f" : "rgba(242, 238, 231, 0.76)")};
  font-family: var(--font-display), var(--font-body), sans-serif;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 1px;
  text-decoration: none;
  text-transform: uppercase;

  &:hover {
    color: #ffb23f;
  }

  &:focus-visible {
    outline: 2px solid #17d6c5;
    outline-offset: -8px;
  }
`;

const DropdownPanel = styled.div<{ $open: boolean }>`
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 200;
  min-width: 250px;
  padding: 10px;
  border: 1px solid rgba(242, 238, 231, 0.14);
  border-radius: 0;
  background:
    linear-gradient(135deg, rgba(232, 93, 0, 0.14), transparent 34%),
    #11100e;
  box-shadow: 0 18px 54px rgba(0, 0, 0, 0.68);
  clip-path: polygon(0 6px, 6px 6px, 6px 0, calc(100% - 6px) 0, calc(100% - 6px) 6px, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 6px calc(100% - 6px), 0 calc(100% - 6px));
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  visibility: ${({ $open }) => ($open ? "visible" : "hidden")};
  transform: translateY(${({ $open }) => ($open ? "0" : "-6px")});
  transition: 0.2s ease;
`;

const DropdownLink = styled(Link)<{ $divider?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: space-between;
  margin-top: ${({ $divider }) => ($divider ? "4px" : "0")};
  border-top: ${({ $divider }) => ($divider ? "1px solid rgba(242, 238, 231, 0.12)" : "0")};
  border-radius: 0;
  padding: ${({ $divider }) => ($divider ? "12px 16px 10px" : "10px 16px")};
  color: rgba(242, 238, 231, 0.78);
  font-size: 14px;
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    background: rgba(232, 93, 0, 0.12);
    color: #f2eee7;
  }
`;

const DropdownText = styled.span`
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
`;

const SpecimenCode = styled.span`
  flex: 0 0 auto;
  border: 1px solid rgba(255, 178, 63, 0.28);
  padding: 2px 6px;
  color: #ffb23f;
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 1px;
  line-height: 1.2;
  text-transform: uppercase;
`;

const ItemThumb = styled.span`
  position: relative;
  display: grid;
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgba(23, 214, 197, 0.42);
  border-radius: 3px;
  background: #11100e;
  color: #17d6c5;
  font-size: 14px;
`;

const Actions = styled.div`
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 20px;

  @media (max-width: 520px) {
    gap: 13px;
    margin-left: auto;
  }
`;

const ActionLink = styled(Link)`
  position: relative;
  display: grid;
  width: 24px;
  height: 40px;
  place-items: center;
  color: rgba(242, 238, 231, 0.76);
  text-decoration: none;

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    color: #ffb23f;
  }

  &:focus-visible {
    outline: 2px solid #17d6c5;
    outline-offset: 4px;
  }

  @media (max-width: 520px) {
    width: 22px;

    svg {
      width: 18px;
      height: 18px;
    }
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
  color: rgba(242, 238, 231, 0.76);
  cursor: pointer;

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    color: #ffb23f;
  }

  &:focus-visible {
    outline: 2px solid #17d6c5;
    outline-offset: 4px;
  }

  @media (max-width: 520px) {
    width: 22px;

    svg {
      width: 18px;
      height: 18px;
    }
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
  border: 1px solid rgba(255, 178, 63, 0.38);
  border-radius: 0;
  background: #11100e;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.5);
  clip-path: polygon(0 6px, 6px 6px, 6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) calc(100% - 6px), calc(100% - 6px) 100%, 0 100%);
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
    color: #ffb23f;
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

  @media (max-width: 520px) {
    right: -6px;
  }
`;

const MenuButton = styled.button`
  display: none;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 0;
  background: transparent;
  color: rgba(242, 238, 231, 0.76);
  cursor: pointer;

  @media (max-width: 1020px) {
    display: grid;
  }

  @media (max-width: 520px) {
    width: 34px;
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
  border-bottom: 1px solid rgba(242, 238, 231, 0.1);
  background: #11100e;
  padding: 12px 24px 24px;
`;

const MobileTrigger = styled.button<{ $open: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 0;
  border: 0;
  border-bottom: 1px solid rgba(242, 238, 231, 0.1);
  background: transparent;
  color: ${({ $open }) => ($open ? "#ffb23f" : "rgba(242, 238, 231, 0.78)")};
  font-family: var(--font-display), var(--font-body), sans-serif;
  font-size: 15px;
  font-weight: 800;
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
    color: rgba(242, 238, 231, 0.62);
    font-size: 13px;
    text-decoration: none;
  }
`;

const MobileLink = styled(Link)`
  padding: 15px 0;
  border-bottom: 1px solid rgba(242, 238, 231, 0.1);
  color: rgba(242, 238, 231, 0.78);
  font-family: var(--font-display), var(--font-body), sans-serif;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 1px;
  text-decoration: none;
  text-transform: uppercase;
`;

const MobileSearchForm = styled.form`
  display: flex;
  height: 42px;
  margin: 6px 0 10px;
  overflow: hidden;
  border: 1px solid rgba(255, 178, 63, 0.38);
  border-radius: 0;
  background: #070707;
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

function shortSpecimenId(id: string) {
  return id.replace(/-/g, "").slice(0, 6).toUpperCase();
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
  const navRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = pathname.startsWith("/admin");

  const vanieSet = collectorSets.find((set) => set.slug === "vanie");
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
        <DropdownText>Hộp mù</DropdownText>
      </DropdownLink>
      <DropdownLink href="/bo-suu-tap" $divider>
        <DropdownText>Tất cả</DropdownText>
      </DropdownLink>
    </>
  );

  const renderCharacterLinks = () => (
    <>
      <DropdownLink href="/bo-suu-tap?nhanvat=vanie">
        <DropdownText>Vanie</DropdownText>
        {vanieSet ? <SpecimenCode title={vanieSet.id}>SET · {vanieSet.slug}</SpecimenCode> : null}
      </DropdownLink>
      {dynamicSets.map((set) => (
        <DropdownLink href={`/bo-suu-tap?nhanvat=${set.slug}`} key={set.id}>
          <DropdownText>
            {set.image ? (
              <ItemThumb>
                <Image src={set.image} alt="" fill sizes="24px" style={{ objectFit: "cover" }} />
              </ItemThumb>
            ) : null}
            {set.name}
          </DropdownText>
          <SpecimenCode title={set.id}>SET · {set.slug || shortSpecimenId(set.id)}</SpecimenCode>
        </DropdownLink>
      ))}
      <DropdownLink href="/bo-suu-tap?nhanvat=all" $divider>
        <DropdownText>Tất cả</DropdownText>
      </DropdownLink>
    </>
  );

  return (
    <HeaderShell ref={navRef} $isAdmin={isAdmin}>
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

              <NavLink href="/bo-suu-tap" $active={pathname.startsWith("/bo-suu-tap")}>BỘ SƯU TẬP</NavLink>
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
              <MobileLink href="/bo-suu-tap">BỘ SƯU TẬP</MobileLink>
              <MobileLink href="/about">GIỚI THIỆU</MobileLink>
            </MobilePanel>
          </>
        )}
      </Nav>
    </HeaderShell>
  );
}
