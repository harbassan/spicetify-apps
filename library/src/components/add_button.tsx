// biome-ignore lint:
import React from "react";

interface AddButtonProps {
	Menu: typeof Spicetify.ReactComponent.Menu;
}

function AddIcon(): React.ReactElement<SVGElement> {
	return (
		<Spicetify.ReactComponent.IconComponent
			semanticColor="textSubdued"
			dangerouslySetInnerHTML={{
				__html:
					'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M15.25 8a.75.75 0 0 1-.75.75H8.75v5.75a.75.75 0 0 1-1.5 0V8.75H1.5a.75.75 0 0 1 0-1.5h5.75V1.5a.75.75 0 0 1 1.5 0v5.75h5.75a.75.75 0 0 1 .75.75z"></path></svg>',
			}}
			iconSize={16}
		/>
	);
}

function AddButton(props: AddButtonProps): React.ReactElement<HTMLButtonElement> {
	const { ReactComponent } = Spicetify;
	const { TooltipWrapper, ButtonTertiary, ContextMenu } = ReactComponent;
	const { Menu } = props;

	return (
		<TooltipWrapper label={"Add"} placement="top">
			<span>
				<ContextMenu trigger="click" menu={Menu}>
					<ButtonTertiary buttonSize="sm" aria-label="Add" iconOnly={AddIcon} />
				</ContextMenu>
			</span>
		</TooltipWrapper>
	);
}

export default AddButton;
