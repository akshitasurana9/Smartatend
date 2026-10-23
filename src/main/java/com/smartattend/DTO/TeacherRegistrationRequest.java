
package com.smartattend.DTO;

public class TeacherRegistrationRequest {

    private String name;
    private String teacherId;
    private String department;
    private String email;
    private String mobile;
    private String password;

    public String getName() {
        return name;
    }

    public String getTeacherId() {
        return teacherId;
    }

    public String getDepartment() {
        return department;
    }

    public String getEmail() {
        return email;
    }

    public String getMobile() {
        return mobile;
    }

    public String getPassword() {
        return password;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setTeacherId(String teacherId) {
        this.teacherId = teacherId;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public void setMobile(String mobile) {
        this.mobile = mobile;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
