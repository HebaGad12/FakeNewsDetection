import { beforeEach, describe, expect, it, vi } from "vitest";
import apiClient from "./apiClient";
import { postsService } from "./postsService";
import { AUTH_TOKEN_KEY } from "@/lib/constants";

vi.mock("./apiClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedApiClient = vi.mocked(apiClient);

describe("postsService feed calls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
  });

  it("uses the public posts endpoint when the user is anonymous", async () => {
    mockedApiClient.get.mockResolvedValueOnce([]);

    await expect(postsService.getAllPosts()).resolves.toEqual([]);

    expect(mockedApiClient.get).toHaveBeenCalledTimes(1);
    expect(mockedApiClient.get).toHaveBeenCalledWith("/posts");
  });

  it("uses the personalized feed endpoint when the user is authenticated", async () => {
    sessionStorage.setItem(AUTH_TOKEN_KEY, "token");
    mockedApiClient.get.mockResolvedValueOnce([]);

    await expect(postsService.getAllPosts()).resolves.toEqual([]);

    expect(mockedApiClient.get).toHaveBeenCalledTimes(1);
    expect(mockedApiClient.get).toHaveBeenCalledWith("/posts/feed");
  });

  it("falls back to public posts if the feed endpoint is missing", async () => {
    sessionStorage.setItem(AUTH_TOKEN_KEY, "token");
    const fallbackPosts = [{ id: "post-1", title: "Fallback" }];

    mockedApiClient.get
      .mockRejectedValueOnce({ response: { status: 404 } })
      .mockResolvedValueOnce(fallbackPosts);

    await expect(postsService.getAllPosts()).resolves.toEqual(fallbackPosts);

    expect(mockedApiClient.get).toHaveBeenNthCalledWith(1, "/posts/feed");
    expect(mockedApiClient.get).toHaveBeenNthCalledWith(2, "/posts");
  });
});
