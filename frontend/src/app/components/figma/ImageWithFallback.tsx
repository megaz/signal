"use client";

import React, { useState } from "react";
import type { StaticImageData } from "next/image";

const ERROR_IMG_SRC =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHZpZXdCb3g9IjAgMCA4OCA4OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9Ijg4IiBoZWlnaHQ9Ijg4IiBmaWxsPSIjRjVGNUY1Ii8+CjxnIG9wYWNpdHk9IjAuNSI+CjxnIG9wYWNpdHk9IjAuNSI+CjxwYXRoIGZpbGwtcnVsZT0iZXZlbm9kZCIgY2xpcC1ydWxlPSJldmVub2RkIiBkPSJNMzMgMjRDMzMuOTM4OSAyNCAzNC44Mzg0IDI0LjM3MjYgMzUuNTAxMSAyNS4wMzUyQzM2LjE2MzcgMjUuNjk3OSAzNi41MzYzIDI2LjU5NzQgMzYuNTM2MyAyNy41MzYzQzM2LjUzNjMgMjguNDc1MyAzNi4xNjM3IDI5LjM3NDggMzUuNTAxMSAzMC4wMzc0QzM0LjgzODQgMzAuNzAwMSAzMy45Mzg5IDMxLjA3MjcgMzMgMzEuMDcyN0MzMi4wNjExIDMxLjA3MjcgMzEuMTYxNiAzMC43MDAxIDMwLjQ5ODkgMzAuMDM3NEMyOS44MzYzIDI5LjM3NDggMjkuNDYzNyAyOC40NzUzIDI5LjQ2MzcgMjcuNTM2M0MyOS40NjM3IDI2LjU5NzQgMjkuODM2MyAyNS42OTc5IDMwLjQ5ODkgMjUuMDM1MkMzMS4xNjE2IDI0LjM3MjYgMzIuMDYxMSAyNCAzMyAyNFoiIGZpbGw9IiNCM0IzQjMiLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik02NCA1Mkw1NiA0MEw0OCA1Mkw0MCA0NEwyNCA2NEg2NEw2NCA1MloiIGZpbGw9IiNCM0IzQjMiLz4KPC9nPgo8L2c+Cjwvc3ZnPgo=";

type ImageWithFallbackProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  "src"
> & {
  src: string | StaticImageData;
};

export function ImageWithFallback(props: ImageWithFallbackProps) {
  const [didError, setDidError] = useState(false);

  const handleError = () => setDidError(true);

  const { src, alt, style, className, ...rest } = props;
  const resolvedSrc = typeof src === "string" ? src : src.src;

  return didError ? (
    <div
      className={`inline-block bg-gray-100 text-center align-middle ${className ?? ""}`}
      style={style}
    >
      <div className="flex items-center justify-center w-full h-full">
        <img src={ERROR_IMG_SRC} alt="Error loading image" {...rest} data-original-url={resolvedSrc} />
      </div>
    </div>
  ) : (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      style={style}
      {...rest}
      onError={handleError}
    />
  );
}
