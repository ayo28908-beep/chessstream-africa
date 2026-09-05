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
          "https://prochess-v2-ashen.vercel.app",
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

// LocalBusiness schema for the brand behind ChessStream Africa (Prochess Academy)
export function LocalBusinessJsonLd() {
  return (
    <JsonLd
      type="SportsActivityLocation"
      data={{
        name: "Prochess Academy",
        description: "Chess academy and live broadcast platform serving Nigeria and Africa. ChessStream Africa is its broadcasting arm.",
        url: "https://chessstream-africa.vercel.app",
        address: {
          "@type": "PostalAddress",
          streetAddress: "38 Ifelodun Street, Orogun",
          addressLocality: "Ibadan",
          addressCountry: "NG",
        },
        telephone: "+2348081635986",
        email: "hello@chessstream.africa",
        sameAs: [
          "https://prochess-v2-ashen.vercel.app",
        ],
        areaServed: "Africa",
      }}
    />
  );
}
