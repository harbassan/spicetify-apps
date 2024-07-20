import React from "react";
import LeadingIcon from "./leading_icon";
import TextInputDialog from "./text_input_dialog";

const editIconPath =
	'<path d="M11.838.714a2.438 2.438 0 0 1 3.448 3.448l-9.841 9.841c-.358.358-.79.633-1.267.806l-3.173 1.146a.75.75 0 0 1-.96-.96l1.146-3.173c.173-.476.448-.909.806-1.267l9.84-9.84zm2.387 1.06a.938.938 0 0 0-1.327 0l-9.84 9.842a1.953 1.953 0 0 0-.456.716L2 14.002l1.669-.604a1.95 1.95 0 0 0 .716-.455l9.841-9.841a.938.938 0 0 0 0-1.327z"></path>';

const deleteIconPath =
	'<path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z"></path><path d="M12 8.75H4v-1.5h8v1.5z"></path>';

const FolderMenu = ({ uri }: { uri: string }) => {
	const { MenuItem, Menu } = Spicetify.ReactComponent;

	const image = SpicetifyLibrary.FolderImageWrapper.getFolderImage(uri);

	const setImage = () => {
		const setNewImage = (newUrl: string) => {
			SpicetifyLibrary.FolderImageWrapper.setFolderImage({ uri, url: newUrl });
		};

		Spicetify.PopupModal.display({
			title: "Set Folder Image",
			//@ts-ignore
			content: <TextInputDialog def={image} onSave={setNewImage} />,
		});
	};

	const removeImage = () => {
		SpicetifyLibrary.FolderImageWrapper.removeFolderImage(uri);
	};

	return (
		<Menu>
			<MenuItem leadingIcon={<LeadingIcon path={editIconPath} />} onClick={setImage}>
				Set Folder Image
			</MenuItem>
			{image && (
				<MenuItem leadingIcon={<LeadingIcon path={deleteIconPath} />} onClick={removeImage}>
					Remove Folder Image
				</MenuItem>
			)}
		</Menu>
	);
};

export default FolderMenu;
