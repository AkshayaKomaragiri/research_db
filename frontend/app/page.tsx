import Sidebar from "../app/components/Sidebar";
import Topbar from "../app/components/Topbar";
import ChatWindow from "../app/components/ChatWindow"

export default function Home() {
  return (
    <div className="flex h-screen">

      <Sidebar />

      <div className="flex flex-1 flex-col">

        <Topbar />

        <ChatWindow />

      </div>

    </div>
  );
}