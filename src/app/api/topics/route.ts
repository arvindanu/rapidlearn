
import { NextRequest, NextResponse } from "next/server";
import type { Topic } from "@/lib/types";

const categorySearches: Record<string, string> = {
  All: "science history technology nature discoveries",
  Science: "science physics biology chemistry",
  Technology: "artificial intelligence robotics computer technology",
  History: "world history ancient civilizations historical events",
  Space: "astronomy planets universe space exploration",
  Nature: "wildlife biodiversity ecosystems natural wonders",
  Psychology: "psychology human brain behavior neuroscience",
  Geography: "geography oceans countries mountains earth",
};

const categoryFor = (category: string) => {
  return category === "All" ? "Discovery" : category;
};

export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get("category") || "All";
    const search = request.nextUrl.searchParams.get("q");

    const searchTerm =
      search?.trim() ||
      categorySearches[category] ||
      categorySearches.All;

    // Fetch topics from Wikipedia
    const wikiUrl = new URL("https://en.wikipedia.org/w/api.php");

    wikiUrl.searchParams.set("action", "query");
    wikiUrl.searchParams.set("generator", "search");
    wikiUrl.searchParams.set("gsrsearch", searchTerm);
    wikiUrl.searchParams.set("gsrlimit", "18");
    wikiUrl.searchParams.set("prop", "extracts|pageimages|info");
    wikiUrl.searchParams.set("exintro", "1");
    wikiUrl.searchParams.set("explaintext", "1");
    wikiUrl.searchParams.set("exchars", "700");
    wikiUrl.searchParams.set("piprop", "thumbnail");
    wikiUrl.searchParams.set("pithumbsize", "900");
    wikiUrl.searchParams.set("inprop", "url");
    wikiUrl.searchParams.set("format", "json");

    const wikiResponse = await fetch(wikiUrl.toString(), {
      headers: {
        "User-Agent": "RapidLearn/1.0 (educational hobby project)",
      },
      next: { revalidate: 3600 },
    });

    if (!wikiResponse.ok) {
      throw new Error("Wikipedia request failed");
    }

    const wikiData = await wikiResponse.json();

    const pages = Object.values(
      wikiData.query?.pages || {}
    ) as Array<Record<string, any>>;

    const topics: Topic[] = pages
      .filter(
        (page) =>
          page.extract &&
          String(page.extract).length > 80
      )
      .map((page) => ({
        id: String(page.pageid),
        title: String(page.title),
        description: String(page.extract),
        image: page.thumbnail?.source || null,
        category: categoryFor(category),
        source: "Wikipedia",
        url:
          page.fullurl ||
          `https://en.wikipedia.org/wiki/${encodeURIComponent(
            String(page.title).replace(/ /g, "_")
          )}`,
      }));

    // Fetch additional space imagery from NASA
    let nasaImage: Topic | null = null;

    if (category === "All" || category === "Space") {
      try {
        const nasaUrl = new URL(
          "https://images-api.nasa.gov/search"
        );

        nasaUrl.searchParams.set("q", "astronomy");
        nasaUrl.searchParams.set("media_type", "image");
        nasaUrl.searchParams.set("page_size", "5");

        const nasaResponse = await fetch(nasaUrl.toString(), {
          next: { revalidate: 3600 },
        });

        if (nasaResponse.ok) {
          const nasaData = await nasaResponse.json();

          const nasaItem = nasaData.collection?.items?.[0];
          const metadata = nasaItem?.data?.[0];

          const image = nasaItem?.links?.find(
            (link: { rel?: string }) => link.rel === "preview"
          )?.href;

          if (metadata && image) {
            const nasaId = metadata.nasa_id || "space-discovery";

            nasaImage = {
              id: `nasa-${nasaId}`,
              title: metadata.title || "NASA Space Discovery",
              description:
                metadata.description?.slice(0, 700) ||
                "Explore an image from NASA's space and science collection.",
              image,
              category: "Space",
              source: "NASA",
              url: `https://images.nasa.gov/details/${nasaId}`,
            };
          }
        }
      } catch (error) {
        console.error("NASA API error:", error);
        // Continue with Wikipedia topics if NASA is unavailable.
      }
    }

    // Combine NASA and Wikipedia discoveries
    const combined = nasaImage
      ? [nasaImage, ...topics]
      : topics;

    return NextResponse.json({
      topics: combined,
      count: combined.length,
    });
  } catch (error) {
    console.error("Topics API error:", error);

    return NextResponse.json(
      {
        error: "Unable to load topics. Please try again.",
        topics: [],
      },
      { status: 500 }
    );
  }
}
