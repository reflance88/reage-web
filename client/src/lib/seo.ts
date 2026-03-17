import { useEffect } from "react";

const DEFAULT_TITLE = "REAGE";

export function useSeo(title?: string | null, description?: string | null) {
  useEffect(() => {
    const previousTitle = document.title;
    let metaDescription = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDescription = metaDescription?.content ?? null;
    let createdMeta = false;

    document.title = title?.trim() ? `${title} | ${DEFAULT_TITLE}` : DEFAULT_TITLE;

    if (description?.trim()) {
      if (metaDescription) {
        metaDescription.content = description;
      } else {
        const meta = document.createElement("meta");
        meta.name = "description";
        meta.content = description;
        document.head.appendChild(meta);
        metaDescription = meta;
        createdMeta = true;
      }
    }

    return () => {
      document.title = previousTitle || DEFAULT_TITLE;
      if (createdMeta && metaDescription) {
        metaDescription.remove();
        return;
      }
      if (metaDescription && previousDescription !== null) {
        metaDescription.content = previousDescription;
      }
    };
  }, [description, title]);
}
