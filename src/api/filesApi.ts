import { http } from "../api/http";
import { endpoints } from "../api/endpoints";

export interface FileUploadResponse { id: string; url: string; }

export const FilesApi = {
  upload: (file: File, path?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (path) form.append("path", path);

    // Note: Our http client sends JSON; for upload we do a direct request
    // Keeping consistent behavior with APP_CONFIG.useApi flag
    return (async () => {
      // Throw if API disabled
      await http.post("/__noop__");
      const res = await fetch(`${location.origin}${endpoints.files.upload}`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error("File upload failed");
      return (await res.json()) as FileUploadResponse;
    })();
  },
};
