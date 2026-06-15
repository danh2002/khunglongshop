"use client";

import Image from "next/image";
import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import {
  FaGripVertical,
  FaImage,
  FaPen,
  FaPlus,
  FaTrash,
  FaUpload,
} from "react-icons/fa6";
import styled from "styled-components";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminUi";
import { normalizeImageForDisplay } from "@/lib/adminProduct";

type HomepageSliderSlide = {
  id: string;
  imageUrl: string;
  title: string;
  subtitle: string | null;
  eyebrow: string | null;
  ctaLabel: string | null;
  ctaUrl: string | null;
  altText: string;
  sortOrder: number;
  isActive: boolean;
};

type FieldErrors = Record<string, string[]>;

type SlideFormState = {
  imageUrl: string;
  title: string;
  subtitle: string;
  eyebrow: string;
  ctaLabel: string;
  ctaUrl: string;
  altText: string;
  sortOrder: number;
  isActive: boolean;
};

const emptyForm: SlideFormState = {
  imageUrl: "",
  title: "",
  subtitle: "",
  eyebrow: "",
  ctaLabel: "",
  ctaUrl: "",
  altText: "",
  sortOrder: 0,
  isActive: true,
};

const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/webp", "image/png", "image/jpeg"];
const AUTOPLAY_SECONDS = 5;

const PageShell = styled(AdminPage)`
  background: #0a0a0a;
`;

const ToolbarButton = styled.button`
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  gap: 8px;
  border: 1px solid #e85d00;
  background: #e85d00;
  padding: 0 16px;
  color: #ffffff;
  font-size: 13px;
  font-weight: 900;
  text-transform: uppercase;
  transition:
    background 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    border-color: #ff7418;
    background: #ff7418;
  }
`;

const Layout = styled.section`
  display: grid;
  grid-template-columns: minmax(300px, 420px) minmax(0, 1fr);
  gap: 18px;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.section`
  border: 1px solid #1e1e1e;
  background: #0f0f0f;
`;

const PanelHeader = styled.header`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid #1e1e1e;
  padding: 18px;
`;

const PanelTitle = styled.h2`
  margin: 0;
  color: #ffffff;
  font-size: 15px;
  font-weight: 900;
  text-transform: uppercase;
`;

const PanelHint = styled.p`
  margin: 4px 0 0;
  color: rgba(255, 255, 255, 0.48);
  font-size: 13px;
`;

const SlideList = styled.div`
  display: grid;
  gap: 10px;
  padding: 14px;
`;

const SlideCard = styled.article<{ $selected: boolean }>`
  display: grid;
  grid-template-columns: 18px 72px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  border: 1px solid #1e1e1e;
  border-left: 4px solid ${({ $selected }) => ($selected ? "#e85d00" : "#1e1e1e")};
  background: ${({ $selected }) => ($selected ? "rgba(232, 93, 0, 0.08)" : "#0a0a0a")};
  padding: 10px;
  text-align: left;
`;

const DragHandle = styled.span`
  display: inline-flex;
  justify-content: center;
  color: rgba(255, 255, 255, 0.32);
`;

const Thumbnail = styled.button`
  position: relative;
  display: grid;
  width: 72px;
  height: 46px;
  place-items: center;
  overflow: hidden;
  border: 1px solid #1e1e1e;
  background: #050505;
  color: rgba(255, 255, 255, 0.35);
`;

const SlideMeta = styled.button`
  min-width: 0;
  border: 0;
  background: transparent;
  padding: 0;
  text-align: left;
`;

const SlideTitle = styled.h3`
  margin: 0;
  overflow: hidden;
  color: #ffffff;
  font-size: 14px;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SlideDetails = styled.div`
  margin-top: 7px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`;

const StatusBadge = styled.span<{ $active: boolean }>`
  display: inline-flex;
  border: 1px solid
    ${({ $active }) => ($active ? "rgba(76, 175, 80, 0.5)" : "rgba(255, 255, 255, 0.16)")};
  background: ${({ $active }) => ($active ? "rgba(76, 175, 80, 0.12)" : "rgba(255, 255, 255, 0.05)")};
  padding: 3px 7px;
  color: ${({ $active }) => ($active ? "#4caf50" : "rgba(255, 255, 255, 0.62)")};
  font-size: 11px;
  font-weight: 900;
  text-transform: uppercase;
`;

const SortOrder = styled.span`
  color: rgba(255, 255, 255, 0.48);
  font-size: 12px;
  font-weight: 800;
`;

const IconActions = styled.div`
  display: flex;
  gap: 6px;
`;

const IconButton = styled.button`
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid #1e1e1e;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.72);
  transition:
    border-color 0.2s ease,
    color 0.2s ease;

  &:hover {
    border-color: #e85d00;
    color: #e85d00;
  }
`;

const EmptyState = styled.div`
  border: 1px dashed rgba(255, 255, 255, 0.16);
  padding: 34px 20px;
  color: rgba(255, 255, 255, 0.52);
  text-align: center;
`;

const ErrorBox = styled.div`
  border: 1px solid rgba(255, 82, 82, 0.4);
  background: rgba(255, 82, 82, 0.08);
  padding: 14px;
  color: #ff9b9b;
  font-size: 13px;
`;

const Form = styled.form`
  display: grid;
  gap: 18px;
  padding: 18px;
`;

const Field = styled.label`
  display: grid;
  gap: 8px;
  color: rgba(255, 255, 255, 0.72);
  font-size: 13px;
  font-weight: 800;
`;

const Input = styled.input`
  min-height: 42px;
  border: 1px solid #1e1e1e;
  background: #0a0a0a;
  padding: 0 12px;
  color: #ffffff;
  outline: none;

  &:focus {
    border-color: #e85d00;
  }

  &:read-only {
    color: rgba(255, 255, 255, 0.58);
  }
`;

const TextArea = styled.textarea`
  min-height: 112px;
  border: 1px solid #1e1e1e;
  background: #0a0a0a;
  padding: 12px;
  color: #ffffff;
  outline: none;
  resize: vertical;

  &:focus {
    border-color: #e85d00;
  }
`;

const TwoColumn = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const UploadZone = styled.button<{ $dragging: boolean }>`
  display: grid;
  min-height: 164px;
  place-items: center;
  border: 1px dashed ${({ $dragging }) => ($dragging ? "#e85d00" : "#2d2d2d")};
  background: ${({ $dragging }) => ($dragging ? "rgba(232, 93, 0, 0.1)" : "#0a0a0a")};
  color: rgba(255, 255, 255, 0.66);
  text-align: center;
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
`;

const UploadContent = styled.span`
  display: grid;
  justify-items: center;
  gap: 8px;
`;

const PreviewFrame = styled.div`
  position: relative;
  width: min(100%, 340px);
  height: 136px;
  overflow: hidden;
  border: 1px solid #1e1e1e;
  background: #050505;
`;

const FieldError = styled.span`
  color: #ff8a8a;
  font-size: 12px;
  font-weight: 700;
`;

const SwitchRow = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid #1e1e1e;
  background: #0a0a0a;
  padding: 14px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 900;
`;

const SwitchInput = styled.input`
  width: 42px;
  height: 22px;
  accent-color: #e85d00;
`;

const SaveButton = styled.button`
  min-height: 46px;
  border: 1px solid #e85d00;
  background: #e85d00;
  color: #ffffff;
  font-size: 13px;
  font-weight: 900;
  text-transform: uppercase;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

const PreviewStrip = styled.section`
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  border: 1px solid #1e1e1e;
  background: #0f0f0f;
  padding: 16px 18px;
`;

const DotRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const PreviewDot = styled.span<{ $active: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: ${({ $active }) => ($active ? "#e85d00" : "#555555")};
`;

const PreviewText = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13px;
  font-weight: 800;
`;

const DialogBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.72);
  padding: 20px;
`;

const DialogPanel = styled.div`
  width: min(100%, 420px);
  border: 1px solid #1e1e1e;
  background: #0f0f0f;
  padding: 22px;
  color: #ffffff;
`;

const DialogTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 900;
  text-transform: uppercase;
`;

const DialogText = styled.p`
  margin: 10px 0 0;
  color: rgba(255, 255, 255, 0.62);
  font-size: 14px;
  line-height: 1.6;
`;

const DialogActions = styled.div`
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

const SecondaryButton = styled.button`
  min-height: 40px;
  border: 1px solid #1e1e1e;
  background: rgba(255, 255, 255, 0.04);
  padding: 0 14px;
  color: rgba(255, 255, 255, 0.78);
  font-weight: 800;
`;

const DangerButton = styled.button`
  min-height: 40px;
  border: 1px solid rgba(255, 82, 82, 0.4);
  background: rgba(255, 82, 82, 0.14);
  padding: 0 14px;
  color: #ff9b9b;
  font-weight: 900;
`;

function toFormState(slide: HomepageSliderSlide): SlideFormState {
  return {
    imageUrl: slide.imageUrl,
    title: slide.title,
    subtitle: slide.subtitle ?? "",
    eyebrow: slide.eyebrow ?? "",
    ctaLabel: slide.ctaLabel ?? "",
    ctaUrl: slide.ctaUrl ?? "",
    altText: slide.altText,
    sortOrder: slide.sortOrder,
    isActive: slide.isActive,
  };
}

function fieldError(errors: FieldErrors, field: keyof SlideFormState) {
  return errors[field]?.[0] ?? null;
}

function validateForm(form: SlideFormState): FieldErrors {
  const errors: FieldErrors = {};
  const ctaUrl = form.ctaUrl.trim().toLowerCase();

  if (!form.imageUrl.trim()) errors.imageUrl = ["Vui lòng upload hoặc chọn ảnh."];
  if (!form.title.trim()) errors.title = ["Tiêu đề là bắt buộc."];
  if (
    ctaUrl &&
    (!ctaUrl.startsWith("/") ||
      ctaUrl.startsWith("//") ||
      ctaUrl.startsWith("http://") ||
      ctaUrl.startsWith("https://") ||
      ctaUrl.includes("javascript:"))
  ) {
    errors.ctaUrl = ["CTA URL phải là đường dẫn nội bộ bắt đầu bằng /."];
  }

  return errors;
}

function validateUploadFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Chỉ hỗ trợ WebP, PNG hoặc JPG.";
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return "Ảnh không được vượt quá 4MB.";
  }

  return null;
}

export default function AdminHomepageSliderPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [slides, setSlides] = useState<HomepageSliderSlide[]>([]);
  const [form, setForm] = useState<SlideFormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [slideToDelete, setSlideToDelete] = useState<HomepageSliderSlide | null>(null);
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  async function loadSlides(selectedId?: string | null) {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await fetch("/api/admin/homepage-slider", {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error?.message || "Không thể tải slider.");
      }

      const nextSlides: HomepageSliderSlide[] = Array.isArray(payload?.items)
        ? payload.items
        : [];
      setSlides(nextSlides);

      if (selectedId) {
        const selectedSlide = nextSlides.find((slide) => slide.id === selectedId);
        if (selectedSlide) {
          setEditingId(selectedSlide.id);
          setForm(toFormState(selectedSlide));
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Không thể tải slider.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadSlides();
  }, []);

  function startNewSlide() {
    setForm({ ...emptyForm, sortOrder: slides.length });
    setEditingId(null);
    setFieldErrors({});
  }

  function selectSlide(slide: HomepageSliderSlide) {
    setEditingId(slide.id);
    setForm(toFormState(slide));
    setFieldErrors({});
  }

  async function uploadFile(file: File) {
    const validationMessage = validateUploadFile(file);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    formData.set("folder", "homepage-slider");

    setIsUploading(true);
    try {
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || typeof payload?.url !== "string") {
        throw new Error(payload?.error?.message || "Tải ảnh thất bại.");
      }

      setForm((current) => ({
        ...current,
        imageUrl: payload.url,
        altText: current.altText || current.title || "Ảnh slider trang chủ",
      }));
      setFieldErrors((current) => ({ ...current, imageUrl: [] }));
      toast.success("Đã tải ảnh lên.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tải ảnh thất bại.");
    } finally {
      setIsUploading(false);
    }
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await uploadFile(file);
  }

  function handleUploadDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDraggingUpload(false);
    const file = event.dataTransfer.files[0];
    if (file) void uploadFile(file);
  }

  async function saveSlide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextFieldErrors = validateForm(form);
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      toast.error("Vui lòng kiểm tra lại thông tin slide.");
      return;
    }

    setIsSaving(true);
    setFieldErrors({});

    const response = await fetch(
      editingId
        ? `/api/admin/homepage-slider/${encodeURIComponent(editingId)}`
        : "/api/admin/homepage-slider",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }
    );
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      setIsSaving(false);
      setFieldErrors(payload?.error?.fieldErrors ?? {});
      toast.error(payload?.error?.message || "Không thể lưu slide.");
      return;
    }

    const savedSlide = payload as HomepageSliderSlide;
    toast.success(editingId ? "Đã cập nhật slide." : "Đã tạo slide.");
    setEditingId(savedSlide.id);
    setForm(toFormState(savedSlide));
    await loadSlides(savedSlide.id);
    setIsSaving(false);
  }

  async function confirmDeleteSlide() {
    if (!slideToDelete) return;

    const response = await fetch(`/api/admin/homepage-slider/${slideToDelete.id}`, {
      method: "DELETE",
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      toast.error(payload?.error?.message || "Không thể xóa slide.");
      return;
    }

    toast.success("Đã xóa slide.");
    if (editingId === slideToDelete.id) startNewSlide();
    setSlideToDelete(null);
    await loadSlides(editingId === slideToDelete.id ? null : editingId);
  }

  const activeSlideCount = slides.filter((slide) => slide.isActive).length;
  const selectedSlide = slides.find((slide) => slide.id === editingId) ?? null;

  return (
    <PageShell>
      <AdminPageHeader
        title="Slider trang chủ"
        description="Quản lý slide CMS hiển thị trên hero trang chủ."
        action={
          <ToolbarButton type="button" onClick={startNewSlide}>
            <FaPlus />
            Thêm slide mới
          </ToolbarButton>
        }
      />

      <Layout>
        <Panel>
          <PanelHeader>
            <div>
              <PanelTitle>Danh sách slide</PanelTitle>
              <PanelHint>{slides.length} slide trong CMS</PanelHint>
            </div>
          </PanelHeader>

          <SlideList>
            {isLoading ? <EmptyState>Đang tải slider...</EmptyState> : null}
            {loadError ? <ErrorBox>{loadError}</ErrorBox> : null}
            {!isLoading && slides.length === 0 ? (
              <EmptyState>Chưa có slide trang chủ.</EmptyState>
            ) : null}
            {slides.map((slide) => (
              <SlideCard key={slide.id} $selected={slide.id === editingId}>
                <DragHandle aria-label="Kéo để sắp xếp">
                  <FaGripVertical />
                </DragHandle>
                <Thumbnail type="button" onClick={() => selectSlide(slide)}>
                  {slide.imageUrl ? (
                    <Image
                      src={normalizeImageForDisplay(slide.imageUrl)}
                      alt={slide.altText || slide.title}
                      fill
                      sizes="72px"
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    <FaImage />
                  )}
                </Thumbnail>
                <SlideMeta type="button" onClick={() => selectSlide(slide)}>
                  <SlideTitle title={slide.title}>{slide.title || "Chưa có tiêu đề"}</SlideTitle>
                  <SlideDetails>
                    <StatusBadge $active={slide.isActive}>
                      {slide.isActive ? "Đang bật" : "Đã tắt"}
                    </StatusBadge>
                    <SortOrder>Thứ tự {slide.sortOrder}</SortOrder>
                  </SlideDetails>
                </SlideMeta>
                <IconActions>
                  <IconButton
                    type="button"
                    aria-label="Sửa slide"
                    onClick={() => selectSlide(slide)}
                  >
                    <FaPen />
                  </IconButton>
                  <IconButton
                    type="button"
                    aria-label="Xóa slide"
                    onClick={() => setSlideToDelete(slide)}
                  >
                    <FaTrash />
                  </IconButton>
                </IconActions>
              </SlideCard>
            ))}
          </SlideList>
        </Panel>

        <Panel>
          <PanelHeader>
            <div>
              <PanelTitle>{editingId ? "Chỉnh sửa slide" : "Tạo slide mới"}</PanelTitle>
              <PanelHint>
                {selectedSlide
                  ? `Đang chọn: ${selectedSlide.title}`
                  : "Nhập nội dung và tải ảnh cho slide mới."}
              </PanelHint>
            </div>
          </PanelHeader>

          <Form onSubmit={saveSlide}>
            <UploadZone
              type="button"
              $dragging={isDraggingUpload}
              disabled={isUploading || isSaving}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDraggingUpload(true);
              }}
              onDragLeave={() => setIsDraggingUpload(false)}
              onDrop={handleUploadDrop}
            >
              <UploadContent>
                {form.imageUrl ? (
                  <PreviewFrame>
                    <Image
                      src={normalizeImageForDisplay(form.imageUrl)}
                      alt={form.altText || form.title || "Preview slide"}
                      fill
                      sizes="340px"
                      style={{ objectFit: "cover" }}
                    />
                  </PreviewFrame>
                ) : (
                  <FaUpload size={28} />
                )}
                <strong>{isUploading ? "Đang tải ảnh..." : "Kéo thả hoặc bấm để upload"}</strong>
                <span>WebP, PNG, JPG · tối đa 4MB · lưu vào /images/homepage-slider/</span>
              </UploadContent>
            </UploadZone>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/webp,image/png,image/jpeg"
              hidden
              onChange={uploadImage}
            />
            {fieldError(fieldErrors, "imageUrl") ? (
              <FieldError>{fieldError(fieldErrors, "imageUrl")}</FieldError>
            ) : null}

            <Field>
              Image URL
              <Input value={form.imageUrl} readOnly placeholder="/images/homepage-slider/..." />
            </Field>

            <Field>
              Tiêu đề
              <Input
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                placeholder="Tên slide hiển thị trên hero"
              />
              {fieldError(fieldErrors, "title") ? (
                <FieldError>{fieldError(fieldErrors, "title")}</FieldError>
              ) : null}
            </Field>

            <Field>
              Nhãn eyebrow
              <Input
                value={form.eyebrow}
                onChange={(event) => setForm({ ...form, eyebrow: event.target.value })}
                placeholder="Ví dụ: Ra mắt 2026"
              />
            </Field>

            <Field>
              Mô tả
              <TextArea
                value={form.subtitle}
                onChange={(event) => setForm({ ...form, subtitle: event.target.value })}
                placeholder="Mô tả ngắn cho slide"
              />
            </Field>

            <TwoColumn>
              <Field>
                CTA Label
                <Input
                  value={form.ctaLabel}
                  onChange={(event) => setForm({ ...form, ctaLabel: event.target.value })}
                  placeholder="Mua ngay"
                />
              </Field>
              <Field>
                CTA URL
                <Input
                  value={form.ctaUrl}
                  onChange={(event) => setForm({ ...form, ctaUrl: event.target.value })}
                  placeholder="/shop"
                />
                {fieldError(fieldErrors, "ctaUrl") ? (
                  <FieldError>{fieldError(fieldErrors, "ctaUrl")}</FieldError>
                ) : null}
              </Field>
            </TwoColumn>

            <TwoColumn>
              <Field>
                Thứ tự
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) =>
                    setForm({ ...form, sortOrder: Number(event.target.value) })
                  }
                />
              </Field>
              <Field>
                Alt text
                <Input
                  value={form.altText}
                  onChange={(event) => setForm({ ...form, altText: event.target.value })}
                  placeholder="Mô tả ảnh cho accessibility"
                />
                {fieldError(fieldErrors, "altText") ? (
                  <FieldError>{fieldError(fieldErrors, "altText")}</FieldError>
                ) : null}
              </Field>
            </TwoColumn>

            <SwitchRow>
              <span>{form.isActive ? "Slide đang bật" : "Slide đang tắt"}</span>
              <SwitchInput
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
              />
            </SwitchRow>

            <SaveButton type="submit" disabled={isSaving || isUploading}>
              {isSaving ? "Đang lưu..." : editingId ? "Lưu thay đổi" : "Tạo slide"}
            </SaveButton>
          </Form>
        </Panel>

        <PreviewStrip>
          <DotRow aria-label="Trạng thái slide">
            {slides.length > 0 ? (
              slides.map((slide) => <PreviewDot key={slide.id} $active={slide.isActive} />)
            ) : (
              <PreviewDot $active={false} />
            )}
          </DotRow>
          <PreviewText>
            {activeSlideCount} / {slides.length} slide đang bật · tự động chuyển mỗi{" "}
            {AUTOPLAY_SECONDS} giây
          </PreviewText>
        </PreviewStrip>
      </Layout>

      {slideToDelete ? (
        <DialogBackdrop
          role="presentation"
          onClick={(event) => {
            if (event.currentTarget === event.target) setSlideToDelete(null);
          }}
        >
          <DialogPanel role="dialog" aria-modal="true" aria-labelledby="delete-slide-title">
            <DialogTitle id="delete-slide-title">Xóa slide?</DialogTitle>
            <DialogText>
              Bạn sắp xóa slide “{slideToDelete.title}”. Dòng dữ liệu sẽ bị xóa,
              nhưng file ảnh đã upload vẫn được giữ lại trên máy chủ.
            </DialogText>
            <DialogActions>
              <SecondaryButton type="button" onClick={() => setSlideToDelete(null)}>
                Hủy
              </SecondaryButton>
              <DangerButton type="button" onClick={confirmDeleteSlide}>
                Xóa slide
              </DangerButton>
            </DialogActions>
          </DialogPanel>
        </DialogBackdrop>
      ) : null}
    </PageShell>
  );
}
