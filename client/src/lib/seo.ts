import { useEffect } from "react";

const DEFAULT_TITLE = "레아쥬 | 올핸드 주파 미세전류 테라피 REAGE";
const DEFAULT_DESCRIPTION = "레아쥬 공식 사이트. 올핸드 주파 미세전류 테라피, 레아쥬 기기, 아카데미, 도입 상담 정보를 제공합니다.";
const DEFAULT_OG_IMAGE = "https://www.reage.co.kr/mainimage.png";

type SeoOptions = {
  canonicalPath?: string | null;
  image?: string | null;
  ogType?: string | null;
  robots?: string | null;
};

type ManagedMeta = {
  created: boolean;
  element: HTMLMetaElement;
  previous: string | null;
};

type ManagedLink = {
  created: boolean;
  element: HTMLLinkElement;
  previous: string | null;
};

function upsertMeta(
  selector: string,
  initializer: () => HTMLMetaElement,
  content: string,
): ManagedMeta {
  let element = document.querySelector<HTMLMetaElement>(selector);
  const previous = element?.content ?? null;
  let created = false;

  if (!element) {
    element = initializer();
    document.head.appendChild(element);
    created = true;
  }

  element.content = content;

  return { created, element, previous };
}

function upsertCanonical(href: string): ManagedLink {
  let element = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const previous = element?.href ?? null;
  let created = false;

  if (!element) {
    element = document.createElement("link");
    element.rel = "canonical";
    document.head.appendChild(element);
    created = true;
  }

  element.href = href;

  return { created, element, previous };
}

export function useSeo(
  title?: string | null,
  description?: string | null,
  options?: SeoOptions,
) {
  useEffect(() => {
    const previousTitle = document.title;
    const pageTitle = title?.trim() ? `${title} | REAGE` : DEFAULT_TITLE;
    const pageDescription = description?.trim() || DEFAULT_DESCRIPTION;
    const canonicalUrl = (() => {
      if (options?.canonicalPath?.trim()) {
        return new URL(options.canonicalPath, window.location.origin).toString();
      }

      return window.location.href;
    })();
    const ogImage = options?.image?.trim() || DEFAULT_OG_IMAGE;
    const ogType = options?.ogType?.trim() || "website";
    const robots = options?.robots?.trim() || "index, follow, max-image-preview:large";

    const managedMeta = [
      upsertMeta('meta[name="description"]', () => {
        const meta = document.createElement("meta");
        meta.name = "description";
        return meta;
      }, pageDescription),
      upsertMeta('meta[property="og:title"]', () => {
        const meta = document.createElement("meta");
        meta.setAttribute("property", "og:title");
        return meta;
      }, pageTitle),
      upsertMeta('meta[property="og:description"]', () => {
        const meta = document.createElement("meta");
        meta.setAttribute("property", "og:description");
        return meta;
      }, pageDescription),
      upsertMeta('meta[property="og:url"]', () => {
        const meta = document.createElement("meta");
        meta.setAttribute("property", "og:url");
        return meta;
      }, canonicalUrl),
      upsertMeta('meta[property="og:image"]', () => {
        const meta = document.createElement("meta");
        meta.setAttribute("property", "og:image");
        return meta;
      }, ogImage),
      upsertMeta('meta[property="og:type"]', () => {
        const meta = document.createElement("meta");
        meta.setAttribute("property", "og:type");
        return meta;
      }, ogType),
      upsertMeta('meta[name="twitter:title"]', () => {
        const meta = document.createElement("meta");
        meta.name = "twitter:title";
        return meta;
      }, pageTitle),
      upsertMeta('meta[name="twitter:description"]', () => {
        const meta = document.createElement("meta");
        meta.name = "twitter:description";
        return meta;
      }, pageDescription),
      upsertMeta('meta[name="twitter:image"]', () => {
        const meta = document.createElement("meta");
        meta.name = "twitter:image";
        return meta;
      }, ogImage),
      upsertMeta('meta[name="twitter:card"]', () => {
        const meta = document.createElement("meta");
        meta.name = "twitter:card";
        return meta;
      }, "summary_large_image"),
      upsertMeta('meta[name="robots"]', () => {
        const meta = document.createElement("meta");
        meta.name = "robots";
        return meta;
      }, robots),
    ];
    const managedCanonical = upsertCanonical(canonicalUrl);

    document.title = pageTitle;

    return () => {
      document.title = previousTitle || DEFAULT_TITLE;

      for (const meta of managedMeta) {
        if (meta.created) {
          meta.element.remove();
          continue;
        }

        if (meta.previous !== null) {
          meta.element.content = meta.previous;
        }
      }

      if (managedCanonical.created) {
        managedCanonical.element.remove();
        return;
      }

      if (managedCanonical.previous !== null) {
        managedCanonical.element.href = managedCanonical.previous;
      }
    };
  }, [description, options?.canonicalPath, options?.image, options?.ogType, options?.robots, title]);
}
