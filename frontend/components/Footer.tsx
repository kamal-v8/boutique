import Link from 'next/link';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative bg-ink text-base overflow-hidden mt-24">
      <div className="mx-auto px-6 md:px-10 py-16 grid grid-cols-1 md:grid-cols-4 gap-12">
        <div>
          <p className="display text-3xl mb-4">BOUTIQUE</p>
          <p className="text-sm opacity-70 max-w-xs">Raw form. Heavy type. Considered goods.</p>
        </div>
        <FooterCol title="Shop" links={[['All', '/products'], ['Apparel', '/products?category=Apparel'], ['Footwear', '/products?category=Footwear'], ['Accessories', '/products?category=Accessories']]} />
        <FooterCol title="Account" links={[['Sign in', '/account'], ['Orders', '/account/orders'], ['Admin', '/admin']]} />
        <FooterCol title="Support" links={[['Shipping', '/'], ['Returns', '/'], ['Contact', '/']]} />
      </div>
      <div className="relative flex items-end justify-end px-6 md:px-10 pb-6">
        <span className="watermark absolute left-0 bottom-0 select-none">{year}</span>
        <p className="label text-base/60 relative z-10">© {year} Boutique — Raw Form</p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="label opacity-50 mb-4">{title}</p>
      <ul className="space-y-3">
        {links.map(([label, href]) => (
          <li key={label}>
            <Link href={href} className="text-sm opacity-90 hover:text-accent transition-colors">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
