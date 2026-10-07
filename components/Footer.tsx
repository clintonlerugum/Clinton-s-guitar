export default function Footer() {
  return (
    <footer className="bg-black text-gray-400 py-10 mt-12 border-t border-gray-800">
      <div className="container grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <img src="/logo.svg" alt="logo" className="h-8 mb-2" />
          <div className="text-sm">© {new Date().getFullYear()} Clinton's Guitar</div>
        </div>

        <div>
          <div className="font-semibold">Navigate</div>
          <ul className="mt-2 text-sm text-gray-300 space-y-1">
            <li><a href="/shop">Shop</a></li>
            <li><a href="/about">About</a></li>
            <li><a href="/contact">Contact</a></li>
          </ul>
        </div>

        <div>
          <div className="font-semibold">Contact</div>
          <div className="mt-2 text-sm text-gray-300">Email: <a href="mailto:lerugumclintonguitars@gmail.com">lerugumclintonguitars@gmail.com</a></div>
          <div className="mt-2 text-sm text-gray-300">Follow: [social links in admin]</div>
        </div>
      </div>
    </footer>
  )
}
