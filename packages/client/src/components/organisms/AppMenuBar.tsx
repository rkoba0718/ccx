import React from "react";
import { Link, useHistory } from "react-router-dom";
import {
	Theme,
	AppBar,
	Toolbar,
	Typography,
	useTheme,
	makeStyles,
	createStyles,
	Button
} from "@material-ui/core";

import AddMenu from "components/molecules/app-bar/AddMenu";
import AccountMenu from "components/molecules/app-bar/AccountMenu";

const useStyles = makeStyles((theme: Theme) =>
	createStyles({
		title: {
			flexGrow: 1,
			color: "white"
		},
		titleLink: {
			textDecoration: "none",
			"&:visited": {
				color: "inherit"
			}
		}
	})
);

type Props = {
	menuIcon?: React.ReactNode;
};

// eslint-disable-next-line react/display-name
const AppMenuBar: React.FunctionComponent<Props> = React.memo(
	({ menuIcon }) => {
		const classes = useStyles(useTheme());
		const history = useHistory();

		return (
			<AppBar position="fixed">
				<Toolbar>
					{menuIcon}
					<Typography variant="h6" noWrap className={classes.title}>
						<Link to="/home" className={classes.titleLink}>
							CCX
						</Link>
					</Typography>
					<AddMenu />
					<AccountMenu />
					<Button
						color="secondary"
						variant="contained"
						onClick={() => history.goBack()}
					>
						Back
					</Button>
				</Toolbar>
			</AppBar>
		);
	}
);

export default AppMenuBar;
