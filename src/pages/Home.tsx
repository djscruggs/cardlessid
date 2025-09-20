import React from "react";
import { useNavigate } from "react-router-dom";
import usePageTitle from "../hooks/usePageTitle";

const Home: React.FC = () => {
  usePageTitle("Home | Cardless ID");
  const handleClick = () => {
    // This method opens a new browser tab with the specified URL
    window.open(
      "https://cardlessid.substack.com/p/what-is-cardless-id",
      "_blank"
    );
  };
  // const isMobile = Boolean(
  //   navigator?.userAgent?.match(
  //     /Android|BlackBerry|iPhone|iPod|Opera Mini|IEMobile|WPDesktop/i
  //   )
  // );
  const navigate = useNavigate();
  const goToDemo = () => {
    navigate("/demo");
  };
  return (
    <>
      <div className="flex-col w-full">
        <div className="px-10 text-gray-800  text-2xl  flex flex-col items-center space-y-2">
          <div className="max-w-3xl text-left mt-4 space-y-4">
            <p>
              24 US states and several European countries require adult sites to
              verify age. Children should never have access to sexually explicit
              material. However, the verification process should be{" "}
              <strong>free, private and portable accross all web sites</strong>.
            </p>
            {/* <div className="ml-10 text-md">
              <ol className="list-decimal">
                <li>
                  Extremely private, and not require any information except
                  birth date
                </li>
                <li>
                  Only necessary to do one time across{" "}
                  <span className="italic">all</span> adult web sites
                </li>
                <li>
                  Provided by a nonprofit that does not retain or monetize your
                  data
                </li>
                <li>Free for end users and providers alike</li>
              </ol>
            </div> */}
            <p>
              We partner with content companies, technology providers, media and
              regulators to make this possible.
            </p>
            <div className="md:hidden">
              <Carousel />
            </div>
            <img
              src="/diagrams/diagram-full.png"
              className="hidden md:block max-w-4xl md:pr-40"
            />
            <div className="flex justify-center items-center space-x-4 my-10">
              <button
                className="bg-logoblue p-2 md:p-4 text-white text-sm sm:text-2xl rounded-full cursor-pointer"
                onClick={handleClick}
              >
                Learn More
              </button>
              <button
                className="bg-logoblue p-2 md:p-4 text-white text-sm sm:text-2xl rounded-full cursor-pointer"
                onClick={goToDemo}
              >
                Try Demo
              </button>
            </div>
          </div>
          <div className="w-full flex justify-center p-0 mb-10 mt-4">
            <iframe
              src="https://cardlessid.substack.com/embed"
              width="400"
              height="150"
            ></iframe>
          </div>
        </div>
      </div>
    </>
  );
};

const Carousel = () => {
  return (
    <>
      <NavButtons />
      <div className="carousel carousel-top bg-white rounded-box space-x-4 p-4">
        {/* The first image, smaller */}
        <div id="item1" className="carousel-item h-80">
          <img
            src="/diagrams/diagram1.png"
            className="rounded-box object-contain w-full"
          />
        </div>

        {/* The middle image, larger */}
        <div id="item2" className="carousel-item h-[700px]">
          <img src="/diagrams/diagram2.png" className="object-contain w-full" />
        </div>

        {/* The third image, smaller */}
        <div id="item3" className="carousel-item h-84">
          <img
            src="/diagrams/diagram3.png"
            className="rounded-box object-contain w-full"
          />
        </div>
      </div>
      <NavButtons />
    </>
  );
};

function NavButtons() {
  return (
    <div className="flex justify-center w-full py-2 gap-2">
      <a href="#item1" className="btn btn-xs">
        1
      </a>
      <a href="#item2" className="btn btn-xs">
        2
      </a>
      <a href="#item3" className="btn btn-xs">
        3
      </a>
    </div>
  );
}

export default Home;
