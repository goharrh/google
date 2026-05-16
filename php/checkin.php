<?php
header("Content-Type: application/json");

include 'dbcon.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $teacher_id = intval($_POST['teacher_id'] ?? 0);

    if ($teacher_id <= 0) {
        echo json_encode(["success" => false, "message" => "Invalid teacher ID"]);
        exit;
    }

    $today = date("Y-m-d");
    $current_time = date("H:i:s");

    // Check if record exists for today
    $stmt = $conn->prepare("SELECT id, check_in FROM teacher_attendance WHERE teacher_id = ? AND attendance_date = ?");
    $stmt->bind_param("is", $teacher_id, $today);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $row = $result->fetch_assoc();
        if (!empty($row['check_in'])) {
            echo json_encode(["success" => false, "message" => "Already checked in today"]);
        } else {
            // Update check-in time
            $upd = $conn->prepare("UPDATE teacher_attendance SET check_in = ?, status = 'present' WHERE id = ?");
            $upd->bind_param("si", $current_time, $row['id']);
            $upd->execute();
            echo json_encode(["success" => true, "message" => "Checked in successfully at " . $current_time]);
            $upd->close();
        }
    } else {
        // Insert new record
        $ins = $conn->prepare("INSERT INTO teacher_attendance (teacher_id, attendance_date, status, check_in) VALUES (?, ?, 'present', ?)");
        $ins->bind_param("iss", $teacher_id, $today, $current_time);
        $ins->execute();
        echo json_encode(["success" => true, "message" => "Checked in successfully at " . $current_time]);
        $ins->close();
    }
    $stmt->close();
} else {
    echo json_encode(["success" => false, "message" => "Invalid request method"]);
}

$conn->close();
?>