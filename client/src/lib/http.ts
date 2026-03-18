function buildInvalidJsonMessage(text: string) {
  const trimmed = text.trim();

  if (!trimmed) {
    return "서버가 비어 있는 응답을 반환했습니다.";
  }

  if (trimmed.startsWith("<")) {
    return "서버가 JSON 대신 HTML 페이지를 반환했습니다. 배포 또는 API 라우팅을 확인해주세요.";
  }

  const preview = trimmed.replace(/\s+/g, " ").slice(0, 120);
  return `서버가 JSON 대신 텍스트를 반환했습니다: ${preview}`;
}

export async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text.trim()) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(buildInvalidJsonMessage(text));
  }
}
