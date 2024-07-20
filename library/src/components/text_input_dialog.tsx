import React, { type FormEvent } from "react";

const TextInputDialog = (props: { def: string; placeholder: string; onSave: (value: string) => void }) => {
	const { ButtonPrimary } = Spicetify.ReactComponent;
	const { def, placeholder, onSave } = props;

	const [value, setValue] = React.useState(def);

	const onSubmit = (e: FormEvent) => {
		e.preventDefault();
		Spicetify.PopupModal.hide();
		onSave(value);
	};

	return (
		<>
			<form className="text-input-form" onSubmit={onSubmit}>
				<label className={"text-input-wrapper"}>
					<input
						className={"text-input"}
						type="text"
						value={value}
						placeholder={placeholder}
						onChange={(e) => setValue(e.target.value)}
					/>
				</label>
				{/* Using a spotify react component inside the modal messes things up */}
				{/* <ButtonPrimary type="submit" buttonSize="sm">
                    Save
                </ButtonPrimary> */}
				<button type="submit" data-encore-id="buttonPrimary" className="Button-sc-qlcn5g-0 Button-small-buttonPrimary">
					<span className="ButtonInner-sc-14ud5tc-0 ButtonInner-small encore-bright-accent-set">Save</span>
				</button>
			</form>
		</>
	);
};

export default TextInputDialog;
