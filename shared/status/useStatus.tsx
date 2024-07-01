import React from "react";
import Status from "./status";

const useStatus = (status: "success" | "error" | "pending", error: Error | null) => {
	if (status === "pending") {
		return <Status icon="library" heading="Loading" subheading="Please wait, this may take a moment" />;
	}

	if (status === "error") {
		return <Status icon="error" heading="Error" subheading={error?.message || "An unknown error occurred"} />;
	}

	return null;
};

export default useStatus;
