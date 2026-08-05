import { Puff } from "react-loader-spinner";

const LoadingScreen: React.FC = () => {
  // Future: Show user stats or tips once a database / persistent storage is added
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform items-center text-center">
      <h1 className="mb-4 text-2xl font-semibold text-white">
        Loading Next Game...
      </h1>
      <p className="mb-6 text-sm text-gray-300">
        Connecting to server and preparing the world
      </p>
      <Puff
        height="200"
        width="200"
        radius={1}
        color="#7ca6e4"
        ariaLabel="Loading game"
        wrapperStyle={{}}
        wrapperClass=""
        visible={true}
      />
    </div>
  );
};

export default LoadingScreen;
