interface JsonLdProps {
  type: string;
  data: Record<string, unknown>;
}

export default function JsonLd({ type, data }: JsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": type,
    ...data,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function OrganizationJsonLd() {
  return (
    <JsonLd
      type="Organization"
      data={{
        name: "ChessStream Africa",
        url: "https://chessstream-africa.vercel.app",
        logo: "https://chessstream-africa.vercel.app/logo.png",
        description: "Live chess broadcasting for African tournaments and federations.",
        sameAs: [
          "https://prochess-lovat.vercel.app",
        ],
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer service",
          email: "hello@chessstream.africa",
        },
      }}
    />
  );
}

export function WebsiteJsonLd() {
  return (
    <JsonLd
      type="WebSite"
      data={{
        name: "ChessStream Africa",
        url: "https://chessstream-africa.vercel.app",
        description: "Live chess broadcasting for African tournaments and federations.",
        potentialAction: {
          "@type": "SearchAction",
          target: "https://chessstream-africa.vercel.app/search?q={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      }}
    />
  );
}
