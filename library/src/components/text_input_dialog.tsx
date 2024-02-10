import React, { FormEvent } from "react";

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
                <ButtonPrimary type="submit" buttonSize="sm">
                    Save
                </ButtonPrimary>
            </form>
        </>
    );
};

export default TextInputDialog;
