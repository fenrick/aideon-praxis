const TITLE_REGEX = /<title[^>]*>([^<]+)<\/title>/;
const OG_TITLE_REGEX = /<meta[^>]*property="og:title"[^>]*content="([^"]+)"/;
const DESCRIPTION_REGEX = /<meta[^>]*name="description"[^>]*content="([^"]+)"/;
const OG_DESCRIPTION_REGEX = /<meta[^>]*property="og:description"[^>]*content="([^"]+)"/;
const OG_IMAGE_REGEX = /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/;

export const glimpse = async (url: string) => {
  const response = await fetch(url);
  const data = await response.text();
  const titleMatch = TITLE_REGEX.exec(data) || OG_TITLE_REGEX.exec(data);
  const descriptionMatch = DESCRIPTION_REGEX.exec(data) || OG_DESCRIPTION_REGEX.exec(data);
  const imageMatch = OG_IMAGE_REGEX.exec(data);

  return {
    title: titleMatch?.at(1) ?? null,
    description: descriptionMatch?.at(1) ?? null,
    image: imageMatch?.at(1) ?? null,
  };
};
