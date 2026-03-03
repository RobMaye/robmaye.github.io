import type { APIRoute, GetStaticPaths } from "astro";
import { getCollection } from "astro:content";
import satori from "satori";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Resolve from project root, not build output
const root = process.cwd();
const assetsDir = join(root, "src/assets");

export const getStaticPaths: GetStaticPaths = async () => {
  const posts = await getCollection("blog", ({ data }) => !data.draft);
  return posts.map((post) => ({
    params: { id: post.id },
    props: { title: post.data.title },
  }));
};

export const GET: APIRoute = async ({ props }) => {
  const { title } = props;

  const [fontSemiBold, fontRegular, bgImage] = await Promise.all([
    readFile(join(assetsDir, "fonts/SpaceGrotesk-SemiBold.ttf")),
    readFile(join(assetsDir, "fonts/SpaceGrotesk-Regular.ttf")),
    readFile(join(assetsDir, "og-bg.png")),
  ]);

  const bgBase64 = `data:image/png;base64,${bgImage.toString("base64")}`;

  const svg = await satori(
    {
      type: "div",
      props: {
        style: {
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          backgroundImage: `url(${bgBase64})`,
          backgroundSize: "1200px 630px",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                padding: "60px 80px 0 80px",
                fontSize: "56px",
                fontWeight: 600,
                fontFamily: "Space Grotesk",
                color: "#b45309",
                lineHeight: 1.2,
                maxWidth: "900px",
              },
              children: title,
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "24px 80px 0 80px",
              },
              children: [
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: "22px",
                      fontWeight: 400,
                      fontFamily: "Space Grotesk",
                      color: "#44403c",
                    },
                    children: "Rob Maye",
                  },
                },
                {
                  type: "div",
                  props: {
                    style: {
                      fontSize: "18px",
                      fontWeight: 400,
                      fontFamily: "Space Grotesk",
                      color: "#78716c",
                    },
                    children: "robertmaye.co.uk",
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Space Grotesk",
          data: fontSemiBold,
          weight: 600,
          style: "normal",
        },
        {
          name: "Space Grotesk",
          data: fontRegular,
          weight: 400,
          style: "normal",
        },
      ],
    }
  );

  const png = await sharp(Buffer.from(svg))
    .flatten({ background: { r: 250, g: 250, b: 249 } }) // stone-50, remove alpha
    .png({ quality: 90 })
    .toBuffer();

  return new Response(png, {
    headers: { "Content-Type": "image/png" },
  });
};
